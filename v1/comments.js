import { createHandler, HTTPNotImplementedError, HTTPUnauthorizedError, HTTPForbiddenError } from '@shgysk8zer0/lambda-http';
import { getPublicKey, verifyVWT } from '@shgysk8zer0/jwk-utils';

async function handler() {
	throw new HTTPNotImplementedError('Not yet implemented.');
}

export default createHandler({
	async get() {
		return Response.json([]);
	},
	async post(req) {
		if (! req.cookies.has('krv-jwt')) {
			throw new HTTPUnauthorizedError('You require authorization to create comments');
		} else {
			const key = await getPublicKey();
			const payload = await verifyVWT(req.cookies.get('krv-jwt'), key, {
				claims: ['jwi', 'nbf', 'exp', 'sub'],
				entitlements: ['comment:create'],
			});

			if (payload instanceof Error) {
				throw new HTTPForbiddenError(payload.message);
			} else {
				return Response.json(payload);
			}
		}
	},
	delete: handler,
}, {
	allowCredentials: true,
	allowOrigins: ['*'],
	allowHeaders: ['Authorization'],
});

