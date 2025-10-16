export async function sendAssistantMessage({ message, history = [], quickAction, context }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('/api/assistant/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ message, history, quickAction, contextHints: context }),
    });
    if (!res.ok) throw new Error('assistant failed');
    const data = await res.json();
    return { content: data?.content, handoff: data?.handoff };
  } finally {
    clearTimeout(timer);
  }
}

export async function streamAssistantMessage({ message, history = [], quickAction, context, onChunk, signal }) {
  const res = await fetch('/api/assistant/respond?stream=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ message, history, quickAction, contextHints: context }),
  });
  if (!res.ok || !res.body) throw new Error('stream failed');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    onChunk?.(chunk);
  }
}


