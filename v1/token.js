import { createHandler } from '@shgysk8zer0/lambda-http/handler.js';
import { HTTPBadRequestError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http/error.js';
import { generateToken, renewToken, parseAuthorizationToken, verifyRequestToken, generateAPIKey, getRequestToken, verifyRequestAPIKey } from './stateless-origin-tokens.js';

const userId = crypto.getRandomValues(new Uint16Array(1))[0];

export default createHandler({
	async get(req) {
		const url = new URL(req.url);

		if (url.searchParams.has('origin')) {
			const token = await generateToken(userId, url.searchParams.get('origin'), { ttl: -1 });

			return Response.json({ token });
		} else if (url.searchParams.has('token')) {
			const token = await renewToken(url.searchParams.get('token'));
			return Response.json({ token });
		} else {
			throw new HTTPBadRequestError('Missing required origin param.');
		}
	},
	async post(req) {
		const { timestamp } = await req.json();
		const data = await parseAuthorizationToken(req);

		if (data === null) {
			throw new HTTPUnauthorizedError('Missing or invalid token');
		} else {
			const key = await generateAPIKey(getRequestToken(req), timestamp);

			return Response.json({
				authorzation: req.headers.get('Authorization'),
				data,
				valid: await verifyRequestToken(req),
				key
			});
		}
	},
	async delete(req) {
		const result = await verifyRequestAPIKey(req);

		if (! result) {
			throw new HTTPUnauthorizedError('Authentication failed.');
		} else {
			return Response.json({ status: 'Success' });
		}
	}
});
