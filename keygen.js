import { generateJWK } from '@shgysk8zer0/jwk-utils/jwk.js';
import { createJWT, verifyJWT } from '@shgysk8zer0/jwk-utils/jwt.js';
import { PS512 as algo } from '@shgysk8zer0/jwk-utils/consts.js';

const key = await generateJWK(algo);

console.log(key);
console.log('CryptoKey' in globalThis);
// const times = [];

// for (let n = 0; n < 100; n++) {
// 	const start = performance.now();
// 	const token = await createJWT({ iat: Math.floor(Date.now() / 1000 )}, key);
// 	// console.log(token);
// 	await verifyJWT(token, key);
// 	times.push(performance.now() - start);
// }

// const sum = times.reduce((sum, num) => sum + num);
// const avg = sum / times.length;
// console.log({ sum, avg });
