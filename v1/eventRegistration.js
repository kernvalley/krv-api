import { NOT_ACCEPTABLE, BAD_REQUEST, NOT_IMPLEMENTED } from '@shgysk8zer0/consts/status';
import { JSON as JSON_MIME } from '@shgysk8zer0/consts/mimes';
import { HTTPError } from '@shgysk8zer0/lambda-http/error';
import { createHandler } from '@shgysk8zer0/lambda-http/handler';
import { isJSONRequest, isFormDataRequest } from '@shgysk8zer0/lambda-http/utils';
import { addToCollection, getFirestore } from './firebase';

async function register(reg) {
	const firestore = await getFirestore();

	return addToCollection(firestore, 'eventRegistration', reg);
}


export default createHandler({
	async post(req) {
		const required = ['name', 'event', 'email', 'postalCode'];

		if (req.headers.has('Accept') && req.headers.get('Accept') !== JSON_MIME) {
			throw new HTTPError(`Does not support Content-Type of ${req.headers.get('Accept')}.`, NOT_ACCEPTABLE);
		} else if(isJSONRequest(req)) {
			const data = await req.json();
			const missing = required.find(param => !(param in data));

			if (typeof missing === 'string') {
				throw new HTTPError(`Missing required field: "${missing}."`, BAD_REQUEST);
			} else {
				const reg = {
					uuid: crypto.randomUUID(),
					event: data.event,
					name: data.name,
					email: data.email,
					postalCode: data.postalCode,
					guests: parseInt(data.guests),
					checkedIn: false,
					regTime: new Date(),
				};

				await register(reg);

				return Response.json(reg);
			}
		} else if (isFormDataRequest(req)) {
			const data = await req.formData();
			const missing = required.find(param => !data.has(param));

			if (typeof missing === 'string') {
				throw new HTTPError(`Missing required field: "${missing}."`, BAD_REQUEST);
			} else {
				const reg = {
					uuid: crypto.randomUUID(),
					event: data.get('event'),
					name: data.get('name'),
					email: data.get('email'),
					guests: data.has('guests') ? parseInt(data.get('guests')) : NaN,
					postalCode: parseInt(data.get('postalCode')),
					checkedIn: false,
					regTime: Date.now(),
				};

				await register(reg);

				return Response.json(reg);
			}
		} else {
			throw new HTTPError('Request is not JSON.', BAD_REQUEST);
		}
	},
	async delete() {
		throw new HTTPError('Not implemented.', NOT_IMPLEMENTED);
	}
}, {
	allowCredentials: true,
	allowHeaders: ['Authorization'],
	requireJWT: true,
	allowOrigins: ['*'],
	requireCORS: true,
});
