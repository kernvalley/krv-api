import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
const cache = new Map();

const token = 'aes-gcm:sha-256:256:weR7mIW_IAlnJ5PxAKKl-w==:OyogQeG_cxXZNYd36NkrDQ587-DN7gxjI1N1NOYII-XwI6ZxYceU_iRWTZEvAAoR4jWXSrT_4poKVKXfrWMX03skH4vF1Eije4vmZFRdaPQZ5l3Y006Mk2mnta5QWAQI-fCzQpWCxpEWOAQ0_8X8BKfvtRlAzBIbJHxRJe5UHSiGrc-9PBaZbPEznqCUstMlijjBu89Ji1C8fyk9G0taL6UsDzn6iiIziQV3BYeeJxya8epBJZVLAw==:_nhpWB3e2Ak_fF8R:oI48JjWydrK2NIRYTVOEWw==';
const alphabet = 'base64url';

async function generateSignature(timestamp = Date.now()) {
	const importedKey = await crypto.subtle.importKey(
		'raw',
		Uint8Array.fromBase64(token.split(':').at(-1), { alphabet: 'base64url' }),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign(
		{ name: 'HMAC', hash: 'SHA-256' },
		importedKey,
		new TextEncoder().encode(timestamp.toString()),
	);

	return new Uint8Array(signature).toBase64({ alphabet });
}

async function fetchAuth(src = '/v1/key') {
	if (cache.has(src)) {
		return cache.get(src);
	} else {
		const url = new URL(src, document.baseURI);
		const timestamp = Date.now();
		url.searchParams.set('timestamp',timestamp);
		url.searchParams.set('signature', await generateSignature(timestamp));
		const resp = await fetch(url, {
			headers: new Headers({ Authorization: `Bearer ${token}`}),
			referrerPolicy: 'origin',
		});
		const key = await resp.json();
		const app = initializeApp(key);
		const auth = getAuth(app);
		cache.set(src, auth);
		return auth;
	}
}

// document.forms.login.addEventListener('submit', async event => {
// 	event.preventDefault();
// 	const data = new FormData(event.target);
// 	const auth = await fetchAuth();

// 	const userObj = await signInWithEmailAndPassword(auth, data.get('email'), data.get('password'));
// 	const token = await userObj.user.getIdToken();
// 	await cookieStore.set({
// 		name: 'token',
// 		value: token,
// 		secure: true,
// 		expires: Date.now() + 3_600_000,
// 		sameSite: 'lax',
// 	});
// });
