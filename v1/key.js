import { HTTPInternalServerError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http/error';
import { createHandler } from '@shgysk8zer0/lambda-http/handler';
import { verifyRequestAPIKey, hasStatelessOriginToken } from './stateless-origin-tokens.js';

export default createHandler({
	async get(req) {
		if (! (
			'process' in globalThis && 'env' in globalThis.process
			&& typeof globalThis.process.env.FIREBASE_CLIENT_KEY === 'string'
			&& typeof globalThis.process.env.FIREBASE_DATABASE_URL === 'string'
			&& typeof globalThis.process.env.FIREBASE_AUTH_DOMAIN === 'string'
			&& typeof globalThis.process.env.FIREBASE_PROJECT_ID === 'string'
			&& typeof globalThis.process.env.FIREBASE_STORAGE_BUCKET === 'string'
			&& typeof globalThis.process.env.FIREBASE_MESSAGING_SENDER_ID === 'string'
			&& typeof globalThis.process.env.FIREBASE_APP_ID === 'string'
			&& typeof globalThis.process.env.FIREBASE_MEASUREMENT_ID === 'string'
		)) {
			throw new HTTPInternalServerError('Missing required environment variables.');
		} else if (! hasStatelessOriginToken()) {
			throw new HTTPInternalServerError('Missing Stateless Origin Token in environment');
		} else if (! await verifyRequestAPIKey(req)) {
			throw new HTTPUnauthorizedError('Invalid, missing, or expired token.');
		} else {
			return Response.json({
				apiKey: process.env.FIREBASE_CLIENT_KEY,
				authDomain: process.env.FIREBASE_AUTH_DOMAIN,
				databaseURL: process.env.FIREBASE_DATABASE_URL,
				projectId: process.env.FIREBASE_PROJECT_ID,
				storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
				messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
				appId: process.env.FIREBASE_APP_ID,
				measurementId: process.env.FIREBASE_MEASUREMENT_ID,
			});
		}
	}
}, {
	logger(err) {
		console.error(err);
	}
});
