import { createHandler } from '@shgysk8zer0/lambda-http/handler';
import { getRequestUser } from './firebase';

export default createHandler({
	async get(req, context) {
		const user = await getRequestUser(req, context);

		return Response.json(user);
	},
	async post(req, context) {
		const user = await getRequestUser(req, context);

		return Response.json(user);
	}
}, {
	allowHeaders: ['Authorization'],
	requireHeaders: ['Authorization'],
	allowCredentials: true,
	requireCors: true,
	// allowOrigins: ['*'],
});
