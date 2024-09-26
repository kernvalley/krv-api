import { BAD_REQUEST, FORBIDDEN, UNAUTHORIZED } from '@shgysk8zer0/consts/status.js';
import { RequestHandlerTest } from '@shgysk8zer0/lambda-http/RequestHandlerTest.js';
import { generateAPIKey, generateToken } from '../v1/stateless-origin-tokens.js';
import { TestRequest } from '@shgysk8zer0/lambda-http/TestRequest.js';

const url = new URL('https://localhost:8888/v1/token');
const headers = { Accept: 'application/json', Origin: url.origin };
const timestamp = Date.now();
const token = await generateToken(0, url.origin, { ttl: 250 });
const expiredToken = await generateToken(1, url.origin, { ttl: 1, created: new Date('2024-08-20T00:00') });
const expiredkey = await generateAPIKey(token, timestamp - 300);
const key = await generateAPIKey(token, timestamp);

const { error } = await RequestHandlerTest.runTests(
	new RequestHandlerTest(
		new TestRequest(url, { headers, searchParams: { origin: url.origin }}),
		[
			RequestHandlerTest.shouldBeOk,
			RequestHandlerTest.shouldBeCorsResponse,
			RequestHandlerTest.shouldHaveJSONKeys('token'),
		]
	),
	new RequestHandlerTest(
		new TestRequest(url, { headers }),
		[RequestHandlerTest.shouldClientError, RequestHandlerTest.shouldBeJSON]
	),
	new RequestHandlerTest(
		TestRequest.json({ timestamp }, url, { token, headers }),
		[
			RequestHandlerTest.shouldBeOk,
			RequestHandlerTest.shouldRequireAuthorization,
			RequestHandlerTest.shouldBeCorsResponse,
			RequestHandlerTest.shouldHaveJSONKeys('key'),
		]
	),
	new RequestHandlerTest(
		TestRequest.json({ timestamp }, url, { headers }),
		[RequestHandlerTest.shouldRequireAuthorization, RequestHandlerTest.shouldBeCorsResponse]
	),
	new RequestHandlerTest(
		TestRequest.json({ timestamp }, url, { token: expiredToken, headers }),
		[RequestHandlerTest.shouldHaveStatus(FORBIDDEN), RequestHandlerTest.shouldBeJSON]
	),
	new RequestHandlerTest(
		TestRequest.json({ timestamp: 0 }, url, { token: expiredToken, headers }),
		[RequestHandlerTest.shouldHaveStatus(BAD_REQUEST), RequestHandlerTest.shouldBeJSON]
	),
	new RequestHandlerTest(
		new TestRequest(url, { method: 'DELETE', headers, token, searchParams: { timestamp, signature: key }}),
		[RequestHandlerTest.shouldBeOk, RequestHandlerTest.shouldBeCorsResponse, RequestHandlerTest.shouldBeJSON]
	),
	new RequestHandlerTest(
		new TestRequest(url, {
			method: 'DELETE',
			headers: { ...headers, Origin: 'https://disallowed.com' },
			token,
			searchParams: { timestamp, signature: key },
		}),
		[RequestHandlerTest.shouldHaveStatus(UNAUTHORIZED), RequestHandlerTest.shouldBeJSON, RequestHandlerTest.shouldBeCorsResponse]
	),
	new RequestHandlerTest(
		new TestRequest(url, { method: 'DELETE', headers, token: expiredToken, searchParams: { timestamp, signature: expiredkey }}),
		[RequestHandlerTest.shouldHaveStatus(UNAUTHORIZED), RequestHandlerTest.shouldBeJSON]
	),
	new RequestHandlerTest(
		new TestRequest(url, { method: 'DELETE', headers, token, searchParams: { timestamp, signature: expiredkey }}),
		[RequestHandlerTest.shouldHaveStatus(UNAUTHORIZED), RequestHandlerTest.shouldBeJSON]
	),
	new RequestHandlerTest(
		new TestRequest(url, { method: 'DELETE', headers, token: expiredToken, searchParams: { timestamp, signature: key }}),
		[RequestHandlerTest.shouldHaveStatus(UNAUTHORIZED), RequestHandlerTest.shouldBeJSON]
	),
	new RequestHandlerTest(
		new TestRequest(url, { headers, method: 'DELETE' }),
		[RequestHandlerTest.shouldClientError]
	),
	new RequestHandlerTest(
		new TestRequest(url, { headers: { ...headers, 'Access-Control-Request-Method': 'POST' }, method: 'OPTIONS' }),
		[RequestHandlerTest.shouldSupportOptionsMethod, RequestHandlerTest.shouldAllowMethod, RequestHandlerTest.shouldPassPreflight]
	),
	new RequestHandlerTest(
		new TestRequest(url, { headers, method: 'PATCH',  }),
		[RequestHandlerTest.shouldNotAllowMethod]
	)
);

if (error) {
	throw error;
}
