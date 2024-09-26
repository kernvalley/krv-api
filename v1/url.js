import { createHandler } from '@shgysk8zer0/lambda-http/handler';
import { HTTPError } from '@shgysk8zer0/lambda-http/error';
import { NOT_FOUND, BAD_REQUEST, FORBIDDEN, CREATED, UNAUTHORIZED, NOT_IMPLEMENTED } from '@shgysk8zer0/consts/status';
import { getFirestore, getRequestUser } from './firebase';

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
			const docRef = db.collection('links').doc(url.searchParams.get('id'));
			const docSnapshot = await docRef.get();

			if (docSnapshot.exists) {
				const { url, status = 302 } = docSnapshot.data();
				return Response.redirect(url, status);
			} else {
				throw new HTTPError('No URL for request.', NOT_FOUND);
			}
		} else {
			throw new HTTPError('Request missing required id.', BAD_REQUEST);
		}
	},
	async post(req, context) {
		if (! (req.headers.has('Authorization') || req.headers.has('Cookie'))) {
			throw new HTTPError('This requires authentication', UNAUTHORIZED);
		} else {
			const data = await req.json();

			if (typeof data.dest !== 'string' || ! URL.canParse(data.dest)) {
				throw new HTTPError('Missing or invalid URL.', BAD_REQUEST);
			} else {
				const now = new Date();
				const user = await getRequestUser(req, context, { requireValidatedEmail: true }).catch(cause => {
					if (cause instanceof HTTPError) {
						throw cause;
					} else {
						throw new HTTPError('Unable to authenticate user.', FORBIDDEN, { cause });
					}
				});

				const firestore = await getFirestore();
				const collectionRef = firestore.collection('links');
				const id = createID();

				await collectionRef.doc(id).set({
					user: user.uid,
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
		throw new HTTPError('DELETE method not yet implemented.', NOT_IMPLEMENTED);
	}
}, {
	allowHeaders: ['Authorization'],
	allowCredentials: true,
});
