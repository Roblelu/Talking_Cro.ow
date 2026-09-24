const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { filterProfanity, CENSORED_MESSAGE } = require('../moderation');
const { createEcoSynthesizer } = require('../ecoVoice');
const source = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }

function fixture(options = {}) {
  const records = new Map([
    ['users/donor', { tiktok_username: '@donor', has_eco_voice: true, eco_voice_extension: '.webm', promotional_croins: 0, purchased_croins: 24, ...options.donor }],
    ['users/streamer', { isPro: true, creator_earnings: 0 }],
  ]);
  const apiCalls = [];
  let sequence = 0;
  let transactions = 0;
  const apply = (store, operation) => {
    const old = operation.kind === 'set' ? {} : { ...store.get(operation.ref.path) };
    for (const [key, value] of Object.entries(operation.data)) {
      if (value?.op === 'increment') old[key] = (old[key] || 0) + value.value;
      else if (value?.op === 'delete') delete old[key];
      else if (value?.op === 'arrayUnion') old[key] = [...new Set([...(old[key] || []), value.value])];
      else old[key] = value;
    }
    store.set(operation.ref.path, old);
  };
  const snapshot = ref => ({ id: ref.path.split('/').at(-1), ref, exists: records.has(ref.path), data: () => records.get(ref.path) });
  const ref = p => ({
    path: p, id: p.split('/').at(-1), collection: n => ref(`${p}/${n}`), doc: n => ref(`${p}/${n || `event-${++sequence}`}`),
    where: (field, operator, value) => ({ query: true, field, value, limit() { return this; } }),
    get: async () => snapshot(ref(p)),
    update: async data => apply(records, { kind: 'update', ref: ref(p), data }),
  });
  const db = {
    collection: ref,
    runTransaction: async callback => {
      transactions++;
      const operations = [];
      let wrote = false;
      const result = await callback({
        get: async r => {
          assert.equal(wrote, false, 'Firestore reads must precede writes');
          if (r.query) return { empty: false, docs: [snapshot(ref('users/donor'))] };
          return snapshot(r);
        },
        update: (r, data) => { wrote = true; operations.push({ kind: 'update', ref: r, data }); },
        set: (r, data) => { wrote = true; operations.push({ kind: 'set', ref: r, data }); },
      });
      if (options.failSettlement && operations.some(o => o.ref.path.startsWith('tts_queue/'))) throw new Error('Simulated delivery failure');
      for (const operation of operations) apply(records, operation);
      return result;
    },
  };
  const axios = {
    post: async (url, body) => {
      apiCalls.push({ method: 'post', url, body });
      if (url.endsWith('/voices/add')) return { data: { voice_id: 'temporary-id', requires_verification: !!options.requiresVerification } };
      if (options.failSynthesis) throw new Error('Simulated synthesis failure');
      return { data: Buffer.from('test audio'), headers: { 'content-type': 'audio/mpeg' } };
    },
    delete: async url => { apiCalls.push({ method: 'delete', url }); if (options.failCleanup) throw new Error('Simulated cleanup failure'); },
  };
  class FormData { append() {} getHeaders() { return {}; } }
  const getStorage = () => ({ bucket: () => ({ file: p => ({
    download: async () => { apiCalls.push({ method: 'download', path: p }); return [Buffer.from('sample')]; },
    save: async () => { apiCalls.push({ method: 'save', path: p }); },
  }) }) });
  const logger = { error() {}, warn() {}, info() {} };
  const context = {
    exports: {}, onCall: (first, second) => second || first, HttpsError, db, logger, getStorage,
    PREMIUM_TTS_API_KEY: options.missingKey ? '' : 'fake-key', PREMIUM_TTS_BILLING_ENABLED: true,
    ECONOMY: { TTS_CROIN_COST: 12, CREATOR_COMMISSION_PERCENTAGE: .25 },
    admin: { firestore: { FieldValue: {
      increment: value => ({ op: 'increment', value }), arrayUnion: value => ({ op: 'arrayUnion', value }),
      delete: () => ({ op: 'delete' }), serverTimestamp: () => 1,
    } } },
    process: { env: options.noModeration ? {} : { GEMINI_API_KEY: 'fake', ECO_BOT_UID: 'central-bot' } },
    GoogleGenerativeAI: class { getGenerativeModel() { return { generateContent: async (request) => {
      if (options.remote === 'fail') throw new Error('Unavailable');
      return { response: { text: () => JSON.stringify({ level: options.malformed ? 'invalid' : options.remote === CENSORED_MESSAGE ? 'block' : options.remote ? 'soften' : 'allow', clean_message: options.remote || request.contents[0].parts[0].text }) } };
    } }; } },
    filterProfanity, CENSORED_MESSAGE, Buffer,
    synthesizeEcoVoice: createEcoSynthesizer({ axios, FormData, getStorage, getApiKey: () => 'fake-key', logger }),
  };
  vm.createContext(context);
  for (const [start, end] of [
    ['exports.processTTSMessage =', '// --- ECONOMIA Y RETENCION ---'],
    ['exports.createEcoVoice =', '// Herramientas de Superusuario'],
    ['exports.testClonedVoiceWeb =', '// CRON JOB: LIMPIEZA'],
    ['async function _filterTextWithGemini', '/**\n * @function filterTTSMessage'],
  ]) {
    const normalized = source.replaceAll('\r\n', '\n');
    const offset = normalized.indexOf(start);
    const finish = normalized.indexOf(end, offset);
    assert.ok(offset >= 0 && finish > offset);
    vm.runInContext(normalized.slice(offset, finish), context);
  }
  return { context, records, apiCalls, transactions: () => transactions,
    chat: message => context.exports.processTTSMessage({ auth: { uid: 'streamer' }, data: { tiktok_username: '@donor', message } }),
  };
}

test('profanity baseline catches accents, repetition, spacing and common obfuscation', () => {
  for (const text of ['pendejo', 'PÉNDEJÁ', 'p.u.t.o', 'p u t a', 'puuutooo', 'm13rda', 'v3rg4', 'coño', 'chinga tu madre', 'fucking', 'pu\u200Bto']) {
    assert.equal(filterProfanity(text), CENSORED_MESSAGE, text);
  }
  for (const text of ['Hola, buenos días', 'computadora', 'disputa', 'un cono de helado', 'España juega mañana', 'El espectáculo es bonito']) {
    assert.equal(filterProfanity(text), text, text);
  }
});

test('severe AI censorship charges both Eco routes without audio', async () => {
  for (const preview of [false, true]) {
    const f = fixture({ remote: CENSORED_MESSAGE });
    const result = preview
      ? await f.context.exports.testClonedVoiceWeb({ auth: { uid: 'donor' }, data: { text: 'Hostilidad grave' } })
      : await f.chat('Hostilidad grave');
    assert.equal(result.censored, true);
    assert.equal(result.charged, true);
    assert.equal(f.records.get('users/donor').purchased_croins, 12);
    assert.equal(f.apiCalls.length, 0);
    assert.equal([...f.records.keys()].some(k => k.startsWith('tts_queue/')), false);
  }
});
test('moderation outage and malformed response never charge', async () => {
  for (const options of [{ remote: 'fail' }, { noModeration: true }, { malformed: true }]) {
    const f = fixture(options);
    await assert.rejects(f.chat('Hola'), e => e.code === 'unavailable');
    assert.equal(f.transactions(), 0);
    assert.equal(f.apiCalls.length, 0);
  }
});
test('light profanity reaches AI for softening', async () => {
  const f = fixture({ remote: 'Me caes mal' });
  await f.chat('me cagas');
  assert.equal(f.apiCalls.find(c => c.url?.includes('/text-to-speech/')).body.text, 'Me caes mal');
});
test('both Eco routes synthesize only the text returned by AI moderation', async () => {
  for (const preview of [false, true]) {
    const f = fixture({ remote: 'Mensaje corregido' });
    if (preview) {
      await f.context.exports.testClonedVoiceWeb({ auth: { uid: 'donor' }, data: { text: 'Texto original' } });
    } else {
      await f.chat('Texto original');
    }
    const synthesis = f.apiCalls.find(c => c.url?.includes('/text-to-speech/'));
    assert.equal(synthesis.body.text, 'Mensaje corregido');
  }
});

test('new sample-only voice delivers, settles commission and deletes temporary voice', async () => {
  const f = fixture();
  assert.equal((await f.chat('Hola')).success, true);
  assert.equal(f.records.get('users/donor').purchased_croins, 12);
  assert.equal(f.records.get('users/streamer').creator_earnings, 3);
  assert.equal(f.records.get('users/streamer').audios_mes_actual, 1);
  assert.equal([...f.records.keys()].filter(p => p.startsWith('tts_queue/')).length, 1);
  assert.equal(f.apiCalls.filter(c => c.method === 'delete').length, 1);
  assert.ok([...f.records.values()].filter(d => d.type === 'tts_message_sent').every(d => d.status === 'succeeded'));
});

test('legacy voice uses its existing ID and promotional balance', async () => {
  const f = fixture({ donor: { eco_voice_id: 'legacy', promotional_croins: 24, purchased_croins: 0 } });
  await f.chat('Hola');
  assert.equal(f.records.get('users/donor').promotional_croins, 12);
  assert.equal(f.apiCalls.length, 1);
  assert.ok(f.apiCalls[0].url.endsWith('/legacy'));
});

for (const failure of ['failSynthesis', 'failSettlement', 'requiresVerification']) {
  test(`${failure} refunds donor and commission without delivering audio`, async () => {
    const f = fixture({ [failure]: true });
    await assert.rejects(f.chat('Hola'), /No se pudo generar/);
    assert.equal(f.records.get('users/donor').purchased_croins, 24);
    assert.equal(f.records.get('users/streamer').creator_earnings, 0);
    assert.equal([...f.records.keys()].filter(p => p.startsWith('tts_queue/')).length, 0);
    assert.ok([...f.records.values()].filter(d => d.type === 'tts_message_sent').every(d => d.status === 'refunded'));
    assert.equal(f.apiCalls.filter(c => c.method === 'delete').length, 1);
  });
}

test('temporary cleanup failure does not refund a delivered message', async () => {
  const f = fixture({ failCleanup: true });
  assert.equal((await f.chat('Hola')).success, true);
  assert.equal(f.records.get('users/donor').purchased_croins, 12);
});

test('missing configuration rejects before money changes', async () => {
  const f = fixture({ missingKey: true });
  await assert.rejects(f.chat('Hola'), /no está disponible/);
  assert.equal(f.transactions(), 0);
});

test('re-recording removes stale voice ID and returns sample registration state', async () => {
  const f = fixture({ donor: { eco_voice_id: 'legacy' } });
  const result = await f.context.exports.createEcoVoice({ auth: { uid: 'donor' }, data: { base64Audio: 'ZmFrZQ==', mimeType: 'audio/webm' } });
  assert.equal(result.has_eco_voice, true);
  assert.equal(f.records.get('users/donor').eco_voice_id, undefined);
});

test('profile preview supports sample-only voices and moderates before billing', async () => {
  const f = fixture();
  const preview = text => f.context.exports.testClonedVoiceWeb({ auth: { uid: 'donor' }, data: { text } });
  assert.match((await preview('Hola')).audioBase64, /^data:audio\/mpeg;base64,/);
});

test('profile preview failure refunds its reservation', async () => {
  const f = fixture({ failSynthesis: true });
  await assert.rejects(f.context.exports.testClonedVoiceWeb({ auth: { uid: 'donor' }, data: { text: 'Hola' } }));
  assert.equal(f.records.get('users/donor').purchased_croins, 24);
});

test('bot requires verified claim, allowed UID and active stream', async () => {
  const f = fixture();
  f.records.set('active_streams/streamer', {});
  const call = (auth, uid = 'streamer') => f.context.exports.processTTSMessage({ auth, data: { streamer_uid: uid, tiktok_username: '@donor', message: 'Hola' } });
  await assert.rejects(call(null), e => e.code === 'unauthenticated');
  await assert.rejects(call({ uid: 'impostor', token: { eco_bot: true } }), e => e.code === 'permission-denied');
  await assert.rejects(call({ uid: 'other' }), e => e.code === 'permission-denied');
  await assert.rejects(call({ uid: 'central-bot', token: { eco_bot: true } }, 'offline'), e => e.code === 'failed-precondition');
  assert.equal(f.transactions(), 0);
  assert.equal((await call({ uid: 'central-bot', token: { eco_bot: true } })).success, true);
});
