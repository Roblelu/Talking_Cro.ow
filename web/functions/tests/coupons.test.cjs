const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCouponHandlers } = require('../coupons');

function fixture() {
  const records = new Map([
    ['users/admin', { isAdmin: true }],
    ['users/user', { creator_credits: 7, promotional_croins: 11, purchased_croins: 19, isPro: false }],
  ]);
  const snapshot = ref => ({ exists: records.has(ref.path), data: () => records.get(ref.path) });
  const ref = path => ({ path, doc: id => ref(`${path}/${id}`), collection: id => ref(`${path}/${id}`), get: async () => snapshot(ref(path)) });
  const apply = ops => {
    const next = new Map(records);
    for (const [type, r, data] of ops) {
      if (type === 'create' && next.has(r.path)) throw new Error('collision');
      if (type === 'update' && !next.has(r.path)) throw new Error('missing document');
      const value = type === 'update' ? { ...next.get(r.path) } : {};
      for (const [key, v] of Object.entries(data)) {
        value[key] = v?.op === 'increment' ? (value[key] || 0) + v.amount
          : v?.op === 'arrayUnion' ? [...new Set([...(value[key] || []), v.item])] : v;
      }
      next.set(r.path, value);
    }
    records.clear();
    for (const [key, value] of next) records.set(key, value);
  };
  let serial = Promise.resolve();
  const db = {
    collection: ref,
    batch() {
      const ops = [];
      return { create: (r, d) => ops.push(['create', r, d]), commit: async () => apply(ops) };
    },
    runTransaction(fn) {
      const promise = serial.then(async () => {
        const ops = [];
        const result = await fn({
          get: async r => { assert.equal(ops.length, 0, 'reads before writes'); return snapshot(r); },
          update: (r, d) => ops.push(['update', r, d]), set: (r, d) => ops.push(['set', r, d]),
        });
        apply(ops);
        return result;
      });
      serial = promise.catch(() => {});
      return promise;
    },
  };
  class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
  const handlers = createCouponHandlers({ db, HttpsError,
    FieldValue: { increment: amount => ({ op: 'increment', amount }), arrayUnion: item => ({ op: 'arrayUnion', item }), serverTimestamp: () => 123 },
    Timestamp: { fromDate: date => ({ toDate: () => date }) },
  });
  return { records, ...handlers,
    redeem: (code, uid = 'user', extra = {}) => handlers.redeemCoupon({ auth: { uid }, data: { code, ...extra } }),
    generate: data => handlers.generateCoupons({ auth: { uid: 'admin' }, data }),
  };
}

test('admin creates 76 coupons per currency with matching fixed amounts and expiry', async () => {
  const f = fixture();
  const result = await f.generate({ includeCredits: true, creditAmounts: { multi: 500, large: 1000, small: 250 } });
  assert.equal(result.coupons.length, 152);
  assert.equal(new Set(result.coupons.map(c => c.code)).size, 152);
  for (const currency of ['credits', 'croins']) {
    const group = result.coupons.filter(c => c.currency === currency);
    assert.equal(group.length, 76);
    assert.equal(group.filter(c => c.type.startsWith('MULTI')).length, 1);
    const coupon = f.records.get(`coupons/${group[0].code}`);
    assert.equal(coupon.maxUses, 25);
    assert.ok(coupon.expiresAt.toDate() - Date.now() > 86300000);
  }
  assert.equal(result.coupons.filter(c => c.currency === 'credits' && c.amount === 96).length, 25);
});

test('unauthenticated and non-admin generation denied; amounts are fixed server-side', async () => {
  const f = fixture();
  await assert.rejects(f.generateCoupons({}), e => e.code === 'unauthenticated');
  await assert.rejects(f.generateCoupons({ auth: { uid: 'user' } }), e => e.code === 'permission-denied');
  const result = await f.generate({ includeCredits: true, creditAmounts: { multi: 999999, large: -1, small: 0 } });
  for (const currency of ['croins', 'credits']) {
    assert.equal(result.coupons.filter(c => c.currency === currency && c.amount === 48).length, 1);
    assert.equal(result.coupons.filter(c => c.currency === currency && c.amount === 96).length, 25);
    assert.equal(result.coupons.filter(c => c.currency === currency && c.amount === 24).length, 50);
  }
});

test('legacy clients generate original Croins batch and legacy coupons still redeem', async () => {
  const f = fixture();
  assert.equal((await f.generate()).coupons.length, 76);
  f.records.set('coupons/OLD', { type: 'single', amount: 48, redeemed: false });
  assert.deepEqual(await f.redeem(' old '), { success: true, amount: 48, currency: 'croins' });
  assert.deepEqual(f.records.get('users/user'), { creator_credits: 7, promotional_croins: 59, purchased_croins: 19, isPro: false });
});

test('credit redemption never adds Croins or Pro and ignores client amount/currency', async () => {
  const f = fixture();
  f.records.set('coupons/CR-TEST', { type: 'single', currency: 'credits', amount: 100, redeemed: false });
  await f.redeem('CR-TEST', 'user', { amount: 999999, currency: 'croins' });
  assert.deepEqual(f.records.get('users/user'), { creator_credits: 107, promotional_croins: 11, purchased_croins: 19, isPro: false });
  assert.equal(f.records.get('users/user/transactions/coupon_CR-TEST').currency, 'credits');
});

test('competing single redemptions only credit once', async () => {
  const f = fixture();
  f.records.set('coupons/ONE', { type: 'single', currency: 'credits', amount: 10 });
  const results = await Promise.allSettled([f.redeem('ONE'), f.redeem('ONE')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.records.get('users/user').creator_credits, 17);
});

test('multi coupon enforces distinct users and exact capacity', async () => {
  const f = fixture();
  f.records.set('coupons/MULTI', { type: 'multi', currency: 'credits', amount: 5, maxUses: 2, usedBy: [] });
  f.records.set('users/second', {}); f.records.set('users/third', {});
  await f.redeem('MULTI');
  await assert.rejects(f.redeem('MULTI'));
  await f.redeem('MULTI', 'second');
  await assert.rejects(f.redeem('MULTI', 'third'));
  assert.equal(f.records.get('coupons/MULTI').redeemed, true);
  assert.equal(f.records.get('users/third').creator_credits, undefined);
});

test('expired, malformed and missing-profile coupons are not consumed', async () => {
  const f = fixture();
  for (const data of [{ amount: -1 }, { currency: 'cash' }, { expiresAt: { toDate: () => new Date(0) } }]) {
    f.records.set('coupons/BAD', { type: 'single', amount: 10, currency: 'credits', redeemed: false, ...data });
    await assert.rejects(f.redeem('BAD'));
    assert.equal(f.records.get('coupons/BAD').redeemed, false);
  }
  f.records.set('coupons/GOOD', { type: 'single', amount: 10, currency: 'credits', redeemed: false });
  await assert.rejects(f.redeem('GOOD', 'absent'));
  assert.equal(f.records.get('coupons/GOOD').redeemed, false);
  for (const code of [3, {}, '../GOOD']) await assert.rejects(f.redeem(code), e => e.code === 'invalid-argument');
});
