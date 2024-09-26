import { getPublicKey, getPrivatekey } from '@shgysk8zer0/jwk-utils/env.js';
import { createJWT, verifyJWT } from '@shgysk8zer0/jwk-utils/jwt.js';

const [publicKey, privateKey] = await Promise.all([getPublicKey(), getPrivatekey()]);

const token = await createJWT('foo', privateKey);
const decoded = await verifyJWT(token, publicKey);
console.log(decoded);
