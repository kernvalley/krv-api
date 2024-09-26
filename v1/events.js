import { HTTPError } from '@shgysk8zer0/lambda-http/error.js';
import { createHandler } from '@shgysk8zer0/lambda-http/handler.js';
import { NOT_IMPLEMENTED } from '@shgysk8zer0/consts/status';

export default createHandler({
	async get() {
		return Response.redirect('https://events.kernvalley.us/events.json');
	},
	async post(req) {
		throw new HTTPError(`${req.method} not implemented.`, NOT_IMPLEMENTED);
	},
	async delete(req) {
		throw new HTTPError(`${req.method} not implemented.`, NOT_IMPLEMENTED);
	}
});

