// Tickets are single-use: EventSource's built-in reconnect must not reuse them.
export function subscribeLiveEvents({ onMessage, onReady = () => {}, onError = () => {}, fetchImpl = fetch, EventSourceImpl = EventSource, retryMs = 2000, timeoutMs = 10000 }) {
  let stopped = false;
  let source;
  let retryTimer;
  let timeoutTimer;
  let controller;

  const retry = (error) => {
    if (stopped) return;
    clearTimeout(timeoutTimer);
    source?.close();
    source = null;
    controller?.abort();
    onReady(false);
    onError(error);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, retryMs);
  };

  const connect = async () => {
    if (stopped) return;
    controller = new AbortController();
    timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = window.API_KEY || sessionStorage.getItem('local_api_key') || '';
      const response = await fetchImpl('http://127.0.0.1:8763/api/ticket', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`No se pudo abrir el chat (HTTP ${response.status}).`);
      const { ticket } = await response.json();
      if (stopped) return;
      if (!ticket) throw new Error('El backend no devolvió un ticket de chat.');
      clearTimeout(timeoutTimer);
      source = new EventSourceImpl(`http://127.0.0.1:8763/api/live_events?ticket=${encodeURIComponent(ticket)}`);
      timeoutTimer = setTimeout(() => retry(new Error('El canal del chat no responde.')), timeoutMs);
      source.onopen = () => { clearTimeout(timeoutTimer); onReady(true); };
      source.onmessage = onMessage;
      source.onerror = () => retry(new Error('Se perdió el canal del chat. Reconectando…'));
    } catch (error) {
      retry(error);
    }
  };

  connect();
  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    clearTimeout(timeoutTimer);
    controller?.abort();
    source?.close();
  };
}
