// Read-only diagnostics. Never print tokens, environment values or raw responses.
const { configstore } = require('./node_modules/firebase-tools/lib/configstore');
const { getAccessToken } = require('./node_modules/firebase-tools/lib/auth');
async function main() {
  const saved = configstore.get('tokens');
  const token = await getAccessToken(saved?.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const get = async url => {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    return { status: r.status, data: r.ok ? await r.json() : null };
  };
  for (const name of ['processTTSMessage', 'testClonedVoiceWeb', 'filterTTSMessage']) {
    const r = await get(`https://cloudfunctions.googleapis.com/v2/projects/talking-crow/locations/us-central1/functions/${name}`);
    const c = r.data?.serviceConfig || {};
    const env = c.environmentVariables || {};
    console.log(JSON.stringify({ name, status: r.status, updated: r.data?.updateTime,
      configured: Object.fromEntries(['ELEVENLABS_API_KEY','PREMIUM_TTS_API_KEY','GEMINI_API_KEY','ECO_BOT_UID'].map(k => [k, Boolean(env[k])])),
      secrets: (c.secretEnvironmentVariables || []).map(s => ({ key: s.key, secret: s.secret, version: s.version })),
      timeout: c.timeoutSeconds, revision: c.revision }));
  }
  const vm = await get('https://compute.googleapis.com/compute/v1/projects/talking-crow/zones/us-central1-c/instances/instance-20260818-001902');
  console.log(JSON.stringify({ vmStatus: vm.status, state: vm.data?.status,
    serviceAccounts: vm.data?.serviceAccounts?.map(s => ({ email: s.email, scopes: s.scopes })) }));
}
main().catch(() => { console.error('Cloud diagnostics failed; no credentials printed.'); process.exitCode = 1; });
