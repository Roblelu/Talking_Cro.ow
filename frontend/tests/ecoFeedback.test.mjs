import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ecoErrorMessage, parseEcoRequest } from '../src/services/ecoFeedback.mjs';

test('censored and malformed requests are never treated as playable audio', () => {
  assert.equal(parseEcoRequest({ audioBase64: 'CENSORED' }).censored, true);
  assert.equal(parseEcoRequest({ censored: true }).censored, true);
  for (const value of ['', undefined, 'not audio!', 'bad']) {
    assert.throws(() => parseEcoRequest({ audioBase64: value }));
  }
});

test('public errors never display upstream provider diagnostics', () => {
  const message = 'ElevenLabs Edge TTS Euler Stream https://example.test/private';
  for (const code of ['functions/internal', 'functions/failed-precondition', 'functions/not-found', undefined]) {
    assert.doesNotMatch(ecoErrorMessage({ code, message }), /eleven|edge|euler|https:/i);
  }
});

test('an Eco request is acknowledged only after playback ends', async () => {
  const ref = { path: 'tts_queue/streamer/requests/test' };
  const audio = parseEcoRequest({ audioBase64: 'YXVkaW8=', message: 'Hola' }, 'test', ref);
  const deleted = [];
  let player;
  const context = vm.createContext({
    audioQueue: [audio], userData: {}, selectedAudioDeviceTTS: 'default', console,
    receivedEcoRequests: { current: new Set([ref.path]) },
    setAudioQueue: () => {}, setToastMessage: () => {},
    deleteDoc: async target => deleted.push(target),
    Audio: class { constructor() { player = this; } play() { return Promise.resolve(); } },
  });
  const source = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('  const handlePlayAudio =');
  const end = source.indexOf('  const handleRejectAudio =', start);
  vm.runInContext(source.slice(start, end).replace('const handlePlayAudio =', 'this.play ='), context);
  context.play('test', audio.audio_url);
  assert.equal(deleted.length, 0);
  player.onended();
  await Promise.resolve();
  assert.equal(deleted[0], ref);
});

test('UI source contains no provider names', () => {
  const roots = [new URL('../src/', import.meta.url), new URL('../../web/src/', import.meta.url)];
  for (const root of roots) {
    for (const file of fs.readdirSync(root, { recursive: true }).filter(name => /\.(jsx|js|mjs|html)$/.test(name))) {
      const text = fs.readFileSync(new URL(file.replaceAll('\\', '/'), root), 'utf8');
      assert.doesNotMatch(text, /eleven\s*labs|edge\s*tts|euler\s*stream/i, file);
    }
  }
});
