// Short-lived authorization stays in memory, never in persistent settings.
export function startBaseVoiceSession({ authorize, send, onError = () => {} }) {
  let stopped = false;
  let timer;
  async function refresh() {
    try {
      const { data } = await authorize();
      if (stopped) return;
      await send(data);
      if (!stopped) timer = setTimeout(refresh, Math.max(5000, (data.expiresIn - 60) * 1000));
    } catch {
      if (!stopped) { onError(); timer = setTimeout(refresh, 15000); }
    }
  }
  refresh();
  return () => { stopped = true; clearTimeout(timer); };
}
