import '@shgysk8zer0/polyfills';
import { readFile as rf, writeFile as wf } from 'node:fs/promises';
import  * as MIMES from '@shgysk8zer0/consts/mimes.js';
import { MIME } from '@shgysk8zer0/lambda-http/lambda-http.js';
import { pathToFileURL, fileURLToPath } from 'node:url';

export function getTypeFromExt(path) {
	if (path instanceof URL) {
		return getTypeFromExt(path.pathname);
	} else if (typeof path !== 'string') {
		throw new TypeError('Cannot get extension from a non-string.');
	} else {
		const ext = '.' + path.split('.').at(-1)?.toLowerCase();

		switch(ext) {
			case '.js':
			case '.mjs':
				return MIMES.JS;

			case '.png':
				return MIMES.PNG;

			case '.jpg':
			case '.jpeg':
				return MIMES.JPEG;

			case '.svg':
				return MIMES.SVG;

			case '.webp':
				return MIMES.WEBP;

			case '.gif':
				return MIMES.GIF;

			case '.css':
				return MIMES.CSS;

			case '.html':
				return MIMES.HTML;

			case '.json':
				return MIMES.JSON;

			case '.md':
				return MIMES.MARKDOWN;

			case '.woff':
				return MIME.WOFF;

			case '.pdf':
				return MIMES.ADOBE_PDF

			default:
				throw new TypeError(`Unknown extension: ${ext}.`);
		}
	}
}

export function getFileURI(path) {
	if (path instanceof URL) {
		return path;
	} else if (typeof path !== 'string') {
		throw new TypeError('Cannot convert non-string to a URL.');
	} else {
		return path.startsWith('file:') ? URL.parse(path) : pathToFileURL(path);
	}
}

export async function readFile(url) {
	if (typeof url === 'string') {
		return readFile(getFileURI(url));
	} else if (! (url instanceof URL)) {
		throw new TypeError('openBlob requires a string or "file:" URL.');
	} else if (url.protocol !== 'file:') {
		throw new TypeError(`Expected file URL to have the file: protcol, but got ${url.protocol}`);
	} else {
		const path = fileURLToPath(url);
		const type = getTypeFromExt(path);
		const buffer = await rf(path);
		return new File([buffer], path.split('/').at(-1), { type });
	}
}

export async function readBlob(url) {
	if (typeof url === 'string') {
		return readBlob(getFileURI(url));
	} else if (! (url instanceof URL)) {
		throw new TypeError('openBlob requires a string or "file:" URL.');
	} else if (url.protocol !== 'file:') {
		throw new TypeError(`Expected file URL to have the file: protcol, but got ${url.protocol}`);
	} else {
		const path = fileURLToPath(url);
		const type = getTypeFromExt(path);
		const buffer = await rf(path);
		return new Blob([buffer], { type });
	}
}

export async function writeBlob(blob, pathURL) {
	if (! (blob instanceof Blob)) {
		throw new TypeError('Not a Blob object.');
	} else if (pathURL instanceof URL) {
		if (pathURL.protocol === 'file:') {
			await wf(fileURLToPath(pathURL), await blob.bytes());
		} else {
			throw new TypeError('Cannot save to non "file:" URLs.');
		}
	} else if (typeof pathURL === 'string' && pathURL.length !== 0) {
		return writeBlob(blob, getFileURI(pathURL));
	} else {
		throw new TypeError('Save location must be a ')
	}
}

export async function writeFile(file, pathURL) {
	if (! (file instanceof File)) {
		throw new TypeError('Not a file.');
	} else if (typeof pathURL === 'string') {
		return writeFile(file, getFileURI(pathURL));
	} else if (! (URL instanceof Function)) {
		throw new TypeError('Path is not a URL.');
	} else {
		return writeBlob(file, new URL(file.name, pathURL));
	}
}

export async function blobToDataURI(blob, { alphabet = 'base64' } = {}) {
	if (! (blob instanceof Blob)) {
		throw new TypeError('Not a Blob.');
	} else if (blob.type.length === 0) {
		throw new TypeError('Blob is missing required "type".');
	} else {
		return `data:${blob.type};base64,${(await blob.bytes()).toBase64({ alphabet })}`;
	}
}

export async function hashBlob(blob, algo = 'SHA-256') {
	if (! (blob instanceof Blob)) {
		throw new TypeError('Not a blob.');
	} else {
		const buffer = await blob.arrayBuffer();
		const digest =  await crypto.subtle.digest(algo.toUpperCase(), buffer);
		return new Uint8Array(digest).toHex();
	}
}

export const sha256Blob = async blob => hashBlob(blob, 'SHA-256');

export const sha384Blob = async blob => hashBlob(blob, 'SHA-384');

export const sha512Blob = async blob => hashBlob(blob, 'SHA-512');

const file = await readFile(import.meta.url);
const hash = await sha256Blob(file);
console.log(hash);
