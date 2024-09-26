import { createHandler, HTTPNotImplementedError } from '@shgysk8zer0/lambda-http';

async function handler() {
	throw new HTTPNotImplementedError('Not yet implemented.');
}

export default createHandler({
	async get() {
		return Response.json([]);
	},
	post: handler,
	delete: handler,
}, {
	allowCredentials: true,
	allowOrigins: ['*'],
	allowHeaders: ['Authorization'],
});

