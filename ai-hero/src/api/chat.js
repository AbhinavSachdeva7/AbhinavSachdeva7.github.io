// Chat API client — connects to Cloudflare Worker with SSE fake-stream support

// In production this is your deployed Worker URL.
// In development, Vite proxies /chat → localhost:8787 (see vite.config.js).
const WORKER_URL = import.meta.env.VITE_WORKER_URL || '/chat';

/**
 * Send a message to the AI and stream the response token by token.
 *
 * @param {string} message - The user's message
 * @param {(token: string) => void} onToken - Called for each streamed token chunk
 * @param {() => void} onDone - Called when the stream ends
 * @param {(error: Error) => void} onError - Called on network/parse error
 */
export async function sendMessage(message, onToken, onDone, onError) {
  let response;
  try {
    response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  } catch (err) {
    onError(new Error('Network error — please check your connection.'));
    return;
  }

  if (!response.ok) {
    onError(new Error(`Server error: ${response.status}`));
    return;
  }

  // Check if the browser supports ReadableStream (all modern browsers do)
  if (!response.body) {
    // Fallback: read full response as text (very old Safari)
    try {
      const text = await response.text();
      // Parse all data: lines and concatenate tokens
      const tokens = text
        .split('\n')
        .filter(line => line.startsWith('data: ') && !line.includes('[DONE]'))
        .map(line => {
          try { return JSON.parse(line.slice(6)).token || ''; }
          catch { return ''; }
        })
        .join('');
      if (tokens) onToken(tokens);
      onDone();
    } catch (err) {
      onError(err);
    }
    return;
  }

  // Stream the SSE response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split('\n');
      // Keep incomplete last line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.token) {
            onToken(parsed.token);
          }
        } catch {
          // Malformed SSE chunk — skip
        }
      }
    }
  } catch (err) {
    onError(err);
    return;
  }

  onDone();
}
