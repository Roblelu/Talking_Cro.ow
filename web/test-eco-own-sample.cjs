// Explicitly authorized test of the owner's sample. No wallet/Firestore writes.
const fs = require('node:fs/promises');
const path = require('node:path');
const { configstore } = require('./node_modules/firebase-tools/lib/configstore');
const { getAccessToken } = require('./node_modules/firebase-tools/lib/auth');
async function main() {
  const token = await getAccessToken(configstore.get('tokens')?.refresh_token,
    ['https://www.googleapis.com/auth/cloud-platform']);
  const googleHeaders = { Authorization: `Bearer ${token.access_token}` };
  async function google(url, options = {}) {
    const r = await fetch(url, { ...options, headers: { ...googleHeaders, ...options.headers }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error(`Google ${new URL(url).hostname}: HTTP ${r.status}`);
    return r;
  }
  const lookup = await (await google('https://identitytoolkit.googleapis.com/v1/projects/talking-crow/accounts:lookup', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ['cnkrxdu@gmail.com'] })
  })).json();
  if (lookup.users?.length !== 1) throw new Error('No unique owner account found');
  const uid = lookup.users[0].localId;
  const profile = await (await google(`https://firestore.googleapis.com/v1/projects/talking-crow/databases/(default)/documents/users/${encodeURIComponent(uid)}`)).json();
  const extension = profile.fields?.eco_voice_extension?.stringValue;
  const bucket = 'talking-crow.firebasestorage.app';
  const prefix = `eco_voices/${uid}/voice_sample`;
  const listing = await (await google(`https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`)).json();
  const candidates = (listing.items || []).filter(o => /^\.(mp3|wav|m4a|mp4|aac|webm|ogg)$/.test(o.name.slice(prefix.length)));
  const sample = candidates.find(o => o.name === prefix + extension) || (candidates.length === 1 ? candidates[0] : null);
  if (!sample) throw new Error('No unambiguous sample found for owner');
  console.log(JSON.stringify({ ownerFound: true, sampleFound: true, bytes: sample.size, format: path.extname(sample.name) }));
  const audio = await (await google(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(sample.name)}?alt=media`)).arrayBuffer();
  const secret = await (await google('https://secretmanager.googleapis.com/v1/projects/talking-crow/secrets/PREMIUM_TTS_API_KEY/versions/latest:access')).json();
  const key = Buffer.from(secret.payload.data, 'base64').toString().trim();
  let temporaryId;
  async function provider(route, options) {
    const r = await fetch('https://api.elevenlabs.io/v1/' + route, {
      ...options, headers: { 'xi-api-key': key, ...options.headers }, signal: AbortSignal.timeout(45000)
    });
    if (!r.ok) {
      let code = 'unknown';
      try { const d = await r.json(); if (typeof d.detail?.status === 'string') code = d.detail.status.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80); } catch {}
      throw new Error(`Provider ${route.split('/')[0]}: HTTP ${r.status}, ${code}`);
    }
    return r;
  }
  try {
    const form = new FormData();
    form.append('name', 'TalkingCrow_owner_diagnostic_' + Date.now());
    form.append('files', new Blob([audio], { type: sample.contentType || 'application/octet-stream' }), 'sample' + path.extname(sample.name));
    const created = await (await provider('voices/add', { method: 'POST', body: form })).json();
    temporaryId = created.voice_id;
    if (!temporaryId) throw new Error('No temporary voice ID returned');
    console.log(JSON.stringify({ temporaryVoiceCreated: true, requiresVerification: !!created.requires_verification }));
    if (created.requires_verification) throw new Error('Voice verification required');
    const response = await provider(`text-to-speech/${encodeURIComponent(temporaryId)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: 'Hola, soy Abraham. Esta es una prueba de mi voz Eco en Talking Crow.', model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
    });
    if (!response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Response is not audio');
    const result = Buffer.from(await response.arrayBuffer());
    const output = path.resolve(__dirname, '../references/voice-checks/eco-owner-check.mp3');
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, result);
    console.log(JSON.stringify({ synthesisSuccess: true, bytes: result.length, output }));
  } finally {
    if (temporaryId) {
      try {
        await provider(`voices/${encodeURIComponent(temporaryId)}`, { method: 'DELETE' });
        console.log(JSON.stringify({ temporaryVoiceDeleted: true }));
      } catch (e) {
        console.log(JSON.stringify({ temporaryVoiceDeleted: false, recoveryVoiceId: temporaryId }));
        throw e;
      }
    }
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
