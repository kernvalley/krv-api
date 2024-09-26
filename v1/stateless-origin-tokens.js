import '@shgysk8zer0/polyfills';
import { HTTPForbiddenError, HTTPBadRequestError, HTTPInternalServerError } from '@shgysk8zer0/lambda-http/error.js';

const SIG_TTL = 30_000;
const HOURS = 60 * 60 * 1000;
const alphabet = 'base64url';

const isOrigin = origin => URL.parse(origin)?.origin === origin;
const between = (min, val, max) => val >= min && val <= max;

function getStatelessOriginKey() {
	if (typeof globalThis.process?.env?.STATELESS_ORIGIN_TOKEN_SECRET !== 'string') {
		throw new HTTPInternalServerError('Missing required Stateless Origin Token environment variable.');
	} else {
		return Uint8Array.fromBase64(process.env.STATELESS_ORIGIN_TOKEN_SECRET);
	}
}

export class StatelessOriginToken {
	#algo;
	#hash;
	#length;
	#salt;
	#payload;
	#iv;
	#hmacKey;

	constructor({ algo, hash, length, salt, payload, hmacKey }) {
		this.#algo = algo;
		this.#hash = hash;
		this.#length = length;
		this.#salt = salt;
		this.#payload = payload;
		this.#hmacKey = hmacKey;
	}

	toString() {
		return [
			this.#algo.toLowerCase(),
			this.#hash.toLowerCase(),
			this.#length,
			this.#salt.toBase64({ alphabet }),
			new Uint8Array(this.#payload).toBase64({ alphabet }),
			this.#iv.toBase64({ alphabet }),
			this.#hmacKey.toBase64({ alphabet }),
		].join(':');
	}

	toJSON() {
		return this.toString();
	}

	static async generate(userId, origin, {
		ttl = 24 * HOURS,
		created = new Date(),
		updated = new Date(),
		length = 256,
		algo = 'AES-GCM',
		hash = 'SHA-256',
		hmacKey = crypto.getRandomValues(new Uint8Array(16)),
	} = {}) {
		if (! isOrigin(origin)) {
			throw new TypeError(`Invalid origin: ${origin}.`);
		}

		const updatedTime = updated.getTime();
		const payload = JSON.stringify({
			userId,
			origin,
			key: hmacKey.toBase64({ alphabet }),
			created: created.getTime(),
			updated: updatedTime,
			ttl,
		});


		const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM IV
		const salt = crypto.getRandomValues(new Uint8Array(16));

		// Derive encryption key from STATELESS_ORIGIN_TOKEN_SECRET_SECRET
		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			getStatelessOriginKey(),
			'HKDF',
			false,
			['deriveKey']
		);

		const key = await crypto.subtle.deriveKey(
			{ name: 'HKDF', hash: hash.toUpperCase(), salt, info: new Uint8Array() },
			keyMaterial,
			{ name: algo.toUpperCase(), length },
			false,
			['encrypt']
		);

		const encrypted = await crypto.subtle.encrypt(
			{ name: algo.toUpperCase(), iv },
			key,
			new TextEncoder().encode(payload)
		);

		// Return encrypted payload and IV (as array buffers)
		return new StatelessOriginToken({
			algo,
			hash: hash.toLowerCase(),
			length,
			salt,
			payload: encrypted,
			iv,
			hmacKey,
		});
	}
}

export const hasStatelessOriginToken = () => typeof globalThis?.process?.env?.STATELESS_ORIGIN_TOKEN_SECRET === 'string';

export async function generateAPIKey(token, timestamp = Date.now()) {
	const now = Date.now();

	if (! Number.isFinite(timestamp) || timestamp < (now - 10_000) || timestamp > (now + 10_000)) {
		throw new HTTPBadRequestError('Timestamp for API key is in the past.');
	} else {
		const { ttl, created, updated, key } = await decryptToken(token);


		if (created > now) {
			throw new HTTPForbiddenError('Token is invlaid.');
		} else if (ttl !== -1 && (updated + ttl) < now) {
			throw new HTTPForbiddenError('Token is expired.');
		} else {
			const importedKey = await crypto.subtle.importKey(
				'raw',
				Uint8Array.fromBase64(key, { alphabet }),
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['sign']
			);

			const signature = await crypto.subtle.sign(
				{ name: 'HMAC', hash: 'SHA-256' },
				importedKey,
				new TextEncoder().encode(timestamp.toString()).buffer,
			);

			return new Uint8Array(signature).toBase64({ alphabet });
		}
	}
}

export async function verifyRequestAPIKey(req) {
	const searchParams = URL.parse(req.url)?.searchParams;

	if (! (searchParams instanceof URLSearchParams && searchParams.has('signature') && searchParams.has('timestamp'))) {
		return false;
	} else {
		const now = Date.now();
		const timestamp = parseInt(searchParams.get('timestamp'));

		if (! between(timestamp - SIG_TTL, now, timestamp + SIG_TTL)) {
			return false;
		} else {
			const token = await parseAuthorizationToken(req);

			if (! isAllowedOrigin(token?.origin, req.headers)) {
				return false;
			} else if (! verifyTokenData(token)) {
				return false;
			} else {
				try {
					const importedKey = await crypto.subtle.importKey(
						'raw',
						Uint8Array.fromBase64(token.key, { alphabet }),
						{ name: 'HMAC', hash: 'SHA-256' },
						false,
						['verify']
					);

					return await crypto.subtle.verify(
						{ name: 'HMAC', hash: 'SHA-256' },
						importedKey,
						// key,
						await Uint8Array.fromBase64(searchParams.get('signature'), { alphabet }).buffer,
						new TextEncoder().encode(searchParams.get('timestamp')).buffer
					);
				} catch(err) {
					console.error(err);
					return false;
				}
			}
		}
	}
}

export async function verifyAPIKey(tokenString, signature, timestamp, origin) {
	const now = Date.now();

	if (! between(timestamp - SIG_TTL, now, timestamp + SIG_TTL)) {
		return false;
	} else if (! isOrigin(origin)) {
		return false;
	} else {
		const token = await decryptToken(tokenString);

		if (token.origin !== origin) {
			return false;
		} else if (! verifyTokenData(token)) {
			return false;
		} else {
			const importedKey = await crypto.subtle.importKey(
				'raw',
				Uint8Array.fromBase64(token.key, { alphabet }),
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['verify']
			);

			return await crypto.subtle.verify(
				{ name: 'HMAC', hash: 'SHA-256' },
				importedKey,
				// key,
				await Uint8Array.fromBase64(signature, { alphabet }).buffer,
				new TextEncoder().encode(timestamp).buffer
			);
		}
	}
}

// export const generateToken = async (...args) => (await StatelessOriginToken.generate.apply(null, args)).toString();
export async function generateToken(userId, origin, {
	ttl = 24 * HOURS,
	created = new Date(),
	updated = new Date(),
	length = 256,
	algo = 'AES-GCM',
	hash = 'SHA-256',
	hmacKey = crypto.getRandomValues(new Uint8Array(16)),
} = {}) {
	if (! isOrigin(origin)) {
		throw new TypeError(`Invalid origin: ${origin}.`);
	}

	const updatedTime = updated.getTime();
	const payload = JSON.stringify({
		userId,
		origin,
		key: hmacKey.toBase64({ alphabet }),
		created: created.getTime(),
		updated: updatedTime,
		ttl,
	});


	const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM IV
	const salt = crypto.getRandomValues(new Uint8Array(16));

	// Derive encryption key from STATELESS_ORIGIN_TOKEN_SECRET_SECRET
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		getStatelessOriginKey(),
		'HKDF',
		false,
		['deriveKey']
	);

	const key = await crypto.subtle.deriveKey(
		{ name: 'HKDF', hash: hash.toUpperCase(), salt, info: new Uint8Array() },
		keyMaterial,
		{ name: algo.toUpperCase(), length },
		false,
		['encrypt']
	);

	const encrypted = await crypto.subtle.encrypt(
		{ name: algo.toUpperCase(), iv },
		key,
		new TextEncoder().encode(payload)
	);

	// Return encrypted payload and IV (as array buffers)
	return [
		algo.toLowerCase(),
		hash.toLowerCase(),
		length,
		salt.toBase64({ alphabet }),
		new Uint8Array(encrypted).toBase64({ alphabet }),
		iv.toBase64({ alphabet }),
		hmacKey.toBase64({ alphabet }),
	].join(':');
}

export function getRequestToken(req) {
	if (req.headers.has('Authorization')) {
		return req.headers.get('Authorization').trim().substring(7);
	} else {
		const url = new URL(req.url);

		if (url.searchParams.has('token')) {
			return url.searchParams.get('token').trim();
		} else {
			return null;
		}
	}
}

export async function parseAuthorizationToken(req) {
	const token = getRequestToken(req);
	return typeof token === 'string' ? await decryptToken(token) : null;
}

export async function decryptToken(token) {
	if (typeof token !== 'string' || token.length === 0) {
		return null;
	} else if (token.startsWith('Bearer ')) {
		token = token.substring(7);
	}

	const [algo, hash, lengthStr, saltStr, encryptedStr, ivStr, hmacKey] = token.trim().split(':');
	const length = parseInt(lengthStr);
	const salt = Uint8Array.fromBase64(saltStr, { alphabet });
	const encryptedPayload = Uint8Array.fromBase64(encryptedStr, { alphabet });
	const iv = Uint8Array.fromBase64(ivStr, { alphabet });

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		getStatelessOriginKey(),
		'HKDF',
		false,
		['deriveKey']
	);

	const key = await crypto.subtle.deriveKey(
		{ name: 'HKDF', hash: hash.toUpperCase(), salt, info: new Uint8Array() },
		keyMaterial,
		{ name: algo.toUpperCase(), length },
		false,
		['decrypt']
	);

	const decrypted = await crypto.subtle.decrypt({ name: algo.toUpperCase(), iv }, key, encryptedPayload);
	const result = Object.freeze(JSON.parse(new TextDecoder().decode(decrypted)));

	if (result.key === hmacKey) {
		return result;
	} else {
		throw new Error('Mismatched key data.');
	}
}

export function verifyTokenData({ created = NaN, updated = NaN, origin, ttl = NaN } = {}) {
	const now = Date.now();
	return created < now && updated < now && (ttl === -1 || (updated + ttl) > now) && typeof origin === 'string' && URL.parse(origin)?.origin === origin;
}

export async function renewToken(token) {
	const { userId, origin, created, ttl, updated } = await decryptToken(token);
	if (ttl !== -1 && updated + ttl < Date.now()) {
		throw new HTTPForbiddenError('Token already expired.');
	} else {
		return await generateToken(userId, origin, {
			created: new Date(created),
			updated: new Date(),
			ttl,
		});
	}
}

export function isAllowedOrigin(origin, headers) {
	if (! (headers instanceof Headers)) {
		throw new TypeError('Expected headers to be an instance of Headers.');
	} else if (headers.has('Origin')) {
		return headers.get('Origin') === origin;
	} else if (headers.has('Referer')) {
		return URL.parse(headers.get('Referer'))?.origin === origin;
	} else {
		return false;
	}
}

export async function verifyToken(token, headers) {
	if (! (headers instanceof Headers) || ! (headers.has('Origin') || headers.has('Referer'))) {
		return false;
	} else {
		const { ttl, created, updated, origin } = await decryptToken(token);

		return verifyToken({ created, updated, ttl, origin }) && isAllowedOrigin(origin, headers);
	}
}

export async function verifyRequestToken(req) {
	if (!(req.headers.has('Origin') || req.headers.has('Referer'))) {
		return false;
	} else if (req.headers.has('Authorization')) {
		return await verifyToken(req.headers.get('Authorization').substring(7), req.headers);
	} else {
		const url = new URL(req.url);

		if (! url.searchParams.has('token')) {
			return false;
		} else {
			return await verifyToken(url.searchParams.get('token'), req.headers);
		}
	}
}
