export interface OutboundMessage { role: 'user' | 'assistant'; content: string }

export function parseStreamData(data: string): { delta: string } | { error: string } | null {
  if (data === '[DONE]') return null;
  try {
    const payload = JSON.parse(data) as { delta?: unknown; error?: unknown; reply?: unknown };
    if (typeof payload.delta === 'string' && payload.delta) return { delta: payload.delta };
    if (typeof payload.reply === 'string' && payload.reply) return { delta: payload.reply };
    if (typeof payload.error === 'string' && payload.error) return { error: payload.error };
    return null;
  } catch { return null; }
}

export async function sendChat(
  messages: readonly OutboundMessage[],
  signal: AbortSignal,
  onDelta: (delta: string) => void,
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify({ messages, stream: true }),
    signal,
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || contentType.includes('application/json')) {
    let payload: unknown = null;
    try { payload = await response.json(); } catch { payload = null; }
    const body = payload && typeof payload === 'object' ? payload as { error?: unknown } : {};
    throw new Error(typeof body.error === 'string' && body.error ? body.error : `Permintaan chat gagal (HTTP ${response.status}).`);
  }
  if (!response.body) throw new Error('Asisten tidak mengembalikan jawaban.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const event = parseStreamData(line.slice(5).trim());
        if (!event) continue;
        if ('error' in event) throw new Error(event.error);
        accumulated += event.delta;
        onDelta(event.delta);
      }
    }
  } finally { reader.cancel().catch(() => undefined); }
  if (!accumulated.trim()) throw new Error('Asisten tidak mengembalikan jawaban.');
  return accumulated;
}