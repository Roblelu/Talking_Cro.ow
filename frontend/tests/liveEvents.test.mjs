import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeLiveEvents } from '../src/services/liveEvents.mjs';

globalThis.window = {};
globalThis.sessionStorage = { getItem: () => '' };
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate) {
  for (let i = 0; i < 100 && !predicate(); i++) await pause(5);
  assert.ok(predicate(), 'Expected asynchronous state transition');
}
class FakeSource {
  static instances = [];
  constructor(url) { this.url = url; FakeSource.instances.push(this); }
  close() { this.closed = true; }
}

test('retries initial failure and obtains a fresh ticket after disconnect', async () => {
  FakeSource.instances = [];
  let calls = 0;
  const ready = [];
  const stop = subscribeLiveEvents({
    fetchImpl: async () => {
      calls++;
      if (calls === 1) throw new Error('Backend still starting');
      return { ok: true, json: async () => ({ ticket: `ticket-${calls}` }) };
    },
    EventSourceImpl: FakeSource, retryMs: 5, timeoutMs: 1000,
    onMessage: () => {}, onReady: value => ready.push(value),
  });
  try {
    await until(() => FakeSource.instances.length === 1);
    const first = FakeSource.instances[0];
    first.onopen();
    assert.equal(ready.at(-1), true);
    first.onerror();
    assert.equal(first.closed, true);
    assert.equal(ready.at(-1), false);
    await until(() => FakeSource.instances.length === 2);
    assert.notEqual(first.url, FakeSource.instances[1].url);
  } finally { stop(); }
  const count = calls;
  await pause(20);
  assert.equal(calls, count);
  assert.equal(FakeSource.instances.at(-1).closed, true);
});

test('unmount during ticket request never opens an orphan connection', async () => {
  FakeSource.instances = [];
  let finish;
  const stop = subscribeLiveEvents({
    fetchImpl: () => new Promise(resolve => { finish = resolve; }),
    EventSourceImpl: FakeSource, onMessage: () => {}, timeoutMs: 1000,
  });
  stop();
  finish({ ok: true, json: async () => ({ ticket: 'late-ticket' }) });
  await pause(5);
  assert.equal(FakeSource.instances.length, 0);
});
