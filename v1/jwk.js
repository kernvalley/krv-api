import { getPublicKey } from '@shgysk8zer0/jwk-utils';
import { createHandler } from '@shgysk8zer0/lambda-http';

export default createHandler({
	async get() {
		const key = await getPublicKey();
		const exported = await crypto.subtle.exportKey('jwk', key);
		return Response.json(exported);
	}
});
