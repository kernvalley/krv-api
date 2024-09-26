import { nodeConfig, browserConfig, ignoreFile } from '@shgysk8zer0/eslint-config';

export default [
	ignoreFile,
	nodeConfig({ files: ['v1/*.js', '*.js'] }),
	browserConfig({ files: ['server/*.js'] }),
];
