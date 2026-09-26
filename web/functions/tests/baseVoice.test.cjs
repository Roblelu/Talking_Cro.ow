const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBaseVoiceHandler } = require('../baseVoice');
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
function fixture(data, fail = false) {
  let calls = 0;
  return { calls: () => calls, handler: createBaseVoiceHandler({ HttpsError, getKey: () => 'private-master',
    db: { collection: () => ({ doc: () => ({ get: async () => ({ exists: !!data, data: () => data }) }) }) },
    axios: { post: async (url, body, options) => { calls++; assert.equal(options.headers['Ocp-Apim-Subscription-Key'], 'private-master'); if (fail) throw Error('private-master'); return { data: 'short-lived-token' }; } },
  }) };
}
test('only authenticated accounts with credits or admin can request a voice session', async () => {
  const f = fixture({ creator_credits: 0 });
  await assert.rejects(f.handler({}), e => e.code === 'unauthenticated');
  await assert.rejects(f.handler({ auth: { uid: 'user' } }), e => e.code === 'permission-denied');
  assert.equal(f.calls(), 0);
});
test('returns only expiring token and reuses cache while still validating credits', async () => {
  const f = fixture({ creator_credits: 1 });
  const a = await f.handler({ auth: { uid: 'user' } });
  const b = await f.handler({ auth: { uid: 'user' } });
  assert.equal(f.calls(), 1);
  assert.equal(a.token, 'short-lived-token'); assert.equal(b.token, a.token);
  assert.equal(a.expiresIn, 540);
  assert.equal(JSON.stringify(a).includes('private-master'), false);
});
test('upstream errors never disclose private key or diagnostics', async () => {
  const f = fixture({ isAdmin: true }, true);
  await assert.rejects(f.handler({ auth: { uid: 'user' } }), e => e.code === 'unavailable' && !e.message.includes('private-master'));
});
