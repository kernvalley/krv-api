/* eslint-env node */
import { HTTPError } from '@shgysk8zer0/lambda-http/error';
import { BAD_REQUEST, UNAUTHORIZED, BAD_GATEWAY, INTERNAL_SERVER_ERROR, FORBIDDEN } from '@shgysk8zer0/consts/status';
import firebase from 'firebase-admin';

const apps = new Map();

export function getBearerToken(req, { cookies }) {
	if (req.headers.has('Authorization')) {
		return req.headers.get('Authorization').replace('Bearer ', '');
	} else if (typeof cookies.get('token') === 'string') {
		return cookies.get('token');
	} else {
		return null;
	}
}

export async function getFirebase({ certKey = 'FIREBASE_CERT', dbKey = 'FIREBASE_DATABASE_URL' } = {}) {
	if (apps.has(certKey)) {
		return apps.get(certKey);
	} else if (typeof globalThis.process !== 'object' || typeof process.env !== 'object') {
		throw new HTTPError('No `process` or `env` in the current environment.', INTERNAL_SERVER_ERROR);
	} else if (typeof process.env[certKey] !== 'string' || typeof process.env[dbKey] !== 'string') {
		throw new HTTPError('Misconfigured server.', INTERNAL_SERVER_ERROR);
	} else {
		try {
			firebase.initializeApp({
				credential: firebase.credential.cert(JSON.parse(atob(process.env[certKey]))),
				databaseURL: process.env[dbKey],
			});

			apps.set(certKey, firebase);

			return firebase;
		} catch(cause) {
			throw new HTTPError('Error initializing Firebase.', INTERNAL_SERVER_ERROR, { cause });
		}
	}
}

export async function getFirestore({ certKey = 'FIREBASE_CERT', dbKey = 'FIREBASE_DATABASE_URL' } = {}) {
	try {
		const firebase = await getFirebase({ certKey, dbKey });
		return firebase.firestore();
	} catch (cause) {
		if (cause instanceof HTTPError) {
			throw cause;
		} else {
			throw new HTTPError('Failed to initialize Firestore', INTERNAL_SERVER_ERROR, { cause });
		}
	}
}

export async function addToCollection(firestore, collectionName, item) {
	if (typeof firestore !== 'object' || firestore === null) {
		throw new HTTPError('Invalid Firestore instance provided.', INTERNAL_SERVER_ERROR);
	} else if (typeof collectionName !== 'string' || collectionName.length === 0) {
		throw new HTTPError('Invalid collection name provided.', INTERNAL_SERVER_ERROR);
	} else {
		try {
			const collectionRef = firestore.collection(collectionName);
			const docRef = typeof item.uuid === 'string'
				? await collectionRef.doc(item.uuid).set(item)
				: await collectionRef.add(item);

			return docRef.id;  // Return the ID of the newly created document
		} catch (cause) {
			// Handle Firestore-specific errors
			if (cause instanceof HTTPError) {
				throw cause;
			} else if (cause.code === 'permission-denied') {
				throw new HTTPError('Permission denied to add to collection', FORBIDDEN, { cause });
			} else {
				throw new HTTPError('Failed to add item to collection', INTERNAL_SERVER_ERROR, { cause });
			}
		}
	}
}

export async function getAuth({ certKey = 'FIREBASE_CERT', dbKey = 'FIREBASE_DATABASE_URL' } = {}) {
	const firebase = await getFirebase({ certKey, dbKey });
	return firebase.auth();
}

export async function getRequestUser(req, context, { requireValidatedEmail = true } = {}) {
	const idToken = getBearerToken(req, context);

	if (!idToken) {
		throw new HTTPError('Missing Authorization header.', BAD_REQUEST);
	}

	try {
		const auth = await getAuth();

		const now = Date.now();
		const {
			auth_time: created,
			exp,
			uid,
			email_verified: verified = false,
		} = await auth.verifyIdToken(idToken);

		if (typeof created !== 'number' || typeof exp !== 'number' || typeof uid !== 'string' || uid.length === 0) {
			throw new HTTPError('Invalid response from auth provider.', BAD_GATEWAY);
		} else if ((created * 1000) > now || (exp * 1000) < now) {
			throw new HTTPError('Token is invalid or expired.', UNAUTHORIZED);
		} else if (requireValidatedEmail && !verified) {
			throw new HTTPError('Email address has not been verified.', UNAUTHORIZED);
		} else {
			const user = await auth.getUser(uid);

			if (user.disabled) {
				throw new HTTPError('User account is disabled.', FORBIDDEN);
			} else {
				return user;
			}
		}

	} catch (cause) {
		if (cause instanceof HTTPError) {
			throw cause;
		} else if (cause.code === 'auth/id-token-expired' || cause.code === 'auth/id-token-revoked') {
			throw new HTTPError('Token is invalid or expired', UNAUTHORIZED, { cause });
		} else {
			throw new HTTPError('An unknown error occured.', INTERNAL_SERVER_ERROR, { cause });
		}
	}
}
