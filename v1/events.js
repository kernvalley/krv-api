import { createHandler, HTTPNotImplementedError } from '@shgysk8zer0/lambda-http';

export default createHandler({
	async get() {
		return Response.redirect('https://events.kernvalley.us/events.json');
	},
	async post(req) {
		throw new HTTPNotImplementedError(`${req.method} not implemented.`);
	},
	async delete(req) {
		throw new HTTPNotImplementedError(`${req.method} not implemented.`);
	}
});

