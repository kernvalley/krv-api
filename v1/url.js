import {
	createHandler, HTTPNotImplementedError, HTTPNotFoundError, HTTPBadRequestError, HTTPForbiddenError,
	HTTPUnauthorizedError
} from '@shgysk8zer0/lambda-http';
import { CREATED, FOUND } from '@shgysk8zer0/consts/status';
import { getFirestore } from './firebase';
import { verifyJWT, getPublicKey } from '@shgysk8zer0/jwk-utils';
import { revokedTokens } from './revokedTokens';

function createID({ length = 8, radix = 16, padding = 2 } = {}) {
	return Array.from(
		crypto.getRandomValues(new Uint8Array(length)),
		num => num.toString(radix).padStart(padding, '0'),
	).join('');
}

export default createHandler({
	async get(req) {
		const url = new URL(req.url);

		if (url.searchParams.has('id')) {
			const db = await getFirestore();
			const docRef = db.collection('links').doc(url.searchParams.get('id').trim());
			const docSnapshot = await docRef.get();

			if (docSnapshot.exists) {
				const { url, status = FOUND } = docSnapshot.data();
				return Response.redirect(url, status);
			} else {
				throw new HTTPNotFoundError('No URL for request.');
			}
		} else {
			throw new HTTPBadRequestError('Request missing required id.');
		}
	},
	async post(req) {
		if (! req.cookies.has('krv-jwt')) {
			throw new HTTPUnauthorizedError('This requires authentication');
		} else {
			const key = await getPublicKey();
			const { sub, jti } = await verifyJWT(req.cookies.get('krv-jwt'), key, {
				claims: ['nbf', 'exp', 'jti', 'sub'],
				entitlements: ['url:create'],
			});

			if (revokedTokens.has(jti)) {
				throw new HTTPForbiddenError('Sorry, but that token has been revoked.');
			}

			const data = await req.json();

			if (typeof data.dest !== 'string' || ! URL.canParse(data.dest)) {
				throw new HTTPBadRequestError('Missing or invalid URL.');
			} else {
				const now = new Date();

				const firestore = await getFirestore();
				const collectionRef = firestore.collection('links');
				const id = createID();

				await collectionRef.doc(id).set({
					user: sub,
					url: data.url,
					created: now,
					update: now,
					status: Number.isSafeInteger(data.status) ? data.status : 302,
				});

				return new Response(null, {
					headers: new Headers({ Location: `/api/url?id=${id}` }),
					status: CREATED,
				});
			}
		}
	},
	async delete() {
		throw new HTTPNotImplementedError('DELETE method not yet implemented.');
	}
}, {
	allowHeaders: ['Authorization'],
	allowCredentials: true,
});
