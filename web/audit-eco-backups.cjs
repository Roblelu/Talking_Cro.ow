// Inventory by default. --delete-verified-owner deletes ONLY the explicitly
// verified owner voice after rechecking its exact profile and readable backup.
const { configstore } = require('./node_modules/firebase-tools/lib/configstore');
const { getAccessToken } = require('./node_modules/firebase-tools/lib/auth');
async function main() {
  const token = await getAccessToken(configstore.get('tokens')?.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  async function google(url, options = {}) {
    const r = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token.access_token}`, ...options.headers }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error(`Google HTTP ${r.status}`);
    return r;
  }
  const secret = await (await google('https://secretmanager.googleapis.com/v1/projects/talking-crow/secrets/PREMIUM_TTS_API_KEY/versions/latest:access')).json();
  const key = Buffer.from(secret.payload.data, 'base64').toString().trim();
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Voice inventory HTTP ${r.status}`);
  const voices = (await r.json()).voices.filter(v => v.category !== 'premade');
  for (const voice of voices) {
    const rows = await (await google('https://firestore.googleapis.com/v1/projects/talking-crow/databases/(default)/documents:runQuery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'users' }],
        select: { fields: [{ fieldPath: 'eco_voice_extension' }] },
        where: { fieldFilter: { field: { fieldPath: 'eco_voice_id' }, op: 'EQUAL', value: { stringValue: voice.voice_id } } } } })
    })).json();
    const docs = rows.filter(row => row.document).map(row => row.document);
    const verified = [];
    for (const doc of docs) {
      const uid = doc.name.split('/').at(-1);
      const prefix = `eco_voices/${uid}/voice_sample`;
      const bucket = 'talking-crow.firebasestorage.app';
      const list = await (await google(`https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}`)).json();
      const candidates = (list.items || []).filter(o => /^\.(mp3|wav|m4a|mp4|aac|webm|ogg)$/.test(o.name.slice(prefix.length)));
      const ext = doc.fields?.eco_voice_extension?.stringValue;
      const sample = candidates.find(o => o.name === prefix + ext) || (candidates.length === 1 ? candidates[0] : null);
      if (!sample || Number(sample.size) <= 0) continue;
      const data = Buffer.from(await (await google(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(sample.name)}?alt=media&generation=${sample.generation}`)).arrayBuffer());
      if (data.length !== Number(sample.size)) continue;
      verified.push({ uid, object: sample.name, generation: sample.generation, bytes: data.length });
    }
    console.log(JSON.stringify({ voiceId: voice.voice_id, name: voice.name, category: voice.category,
      exactProfileMatches: docs.length, verifiedBackups: verified,
      eligible: docs.length > 0 && verified.length === docs.length }));
    if (process.argv.includes('--delete-verified-owner') && voice.voice_id === 'HGJFxQ4hWs8cmK6lY8dX' && docs.length === 1 && verified.length === 1) {
      const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.voice_id}`, {
        method: 'DELETE', headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error(`Deletion HTTP ${response.status}`);
      console.log(JSON.stringify({ deleted: voice.name }));
      // Remove only the stale voice ID, and only if the audited profile is unchanged.
      const doc = docs[0];
      await google(`https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=eco_voice_id&currentDocument.updateTime=${encodeURIComponent(doc.updateTime)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: {} })
      });
      console.log(JSON.stringify({ staleProfileVoiceIdRemoved: true, originalSamplePreserved: true }));
    }
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
