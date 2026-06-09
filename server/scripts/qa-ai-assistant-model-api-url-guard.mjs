import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  isBlockedModelApiHostname,
  modelApiUrlMatchesAllowlist,
  parseIpv4MappedIpv6Address,
  validateModelApiUrl,
} = require('../src/taoyuanAi/modelApiUrlGuard');

function assertUrlRejected(apiUrl, options, label) {
  assert.throws(
    () => validateModelApiUrl(apiUrl, options),
    error => error?.status === 400,
    label,
  );
}

assert.deepEqual(validateModelApiUrl('', { allowlist: ['model.example.test'] }), {
  ok: true,
  url: null,
  allowlist: ['model.example.test'],
});

const allowed = validateModelApiUrl('https://model.example.test/v1/', {
  allowlist: ['model.example.test'],
});
assert.equal(allowed.ok, true);
assert.equal(allowed.url.href, 'https://model.example.test/v1/');

assert.equal(parseIpv4MappedIpv6Address('::ffff:7f00:1'), '127.0.0.1');
assert.equal(isBlockedModelApiHostname('localhost'), true);
assert.equal(isBlockedModelApiHostname('127.0.0.1'), true);
assert.equal(isBlockedModelApiHostname('10.0.0.5'), true);
assert.equal(isBlockedModelApiHostname('192.168.1.12'), true);
assert.equal(isBlockedModelApiHostname('[::1]'), true);
assert.equal(isBlockedModelApiHostname('model.example.test'), false);

assert.equal(
  modelApiUrlMatchesAllowlist(new URL('https://api.example.test/v1/chat'), ['*.example.test']),
  true,
);
assert.equal(
  modelApiUrlMatchesAllowlist(new URL('https://api.example.test/v1/chat'), ['https://api.example.test/v1']),
  true,
);
assert.equal(
  modelApiUrlMatchesAllowlist(new URL('https://api.example.test/v1/chat'), ['https://model.example.test/v1']),
  false,
);

assertUrlRejected('file:///tmp/model.sock', {}, 'file protocol must be rejected');
assertUrlRejected('https://localhost/v1', {}, 'localhost must be rejected');
assertUrlRejected('http://model.example.test/v1', { production: true }, 'production HTTP must be rejected');
assertUrlRejected('https://model.example.test/v1', { allowlist: ['allowed.example.test'] }, 'allowlist mismatch must be rejected');

console.log('qa-ai-assistant-model-api-url-guard passed');
