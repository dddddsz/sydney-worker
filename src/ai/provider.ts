import { logLine, LogContext } from '../ctx';

export interface ChatMessage {
  role: string;
  content: string;
  name?: string;
}

export async function callProvider(
  messages: ChatMessage[],
  baseUrl: string,
  apiKey: string,
  model: string,
  ctx: LogContext,
  reqStart: number,
  source: string,
  timeout: number,
): Promise<string> {
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  logLine(ctx, source, `model=${model}`, 'REQ');

  const body = {
    model,
    messages,
    max_tokens: 1024,
  };

  logLine(ctx, source, JSON.stringify(body), 'BODY');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logLine(ctx, source, `timeout=${timeout}ms duration=${Date.now() - reqStart}ms`, 'TIMEOUT');
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw err;
  }

  if (!response.ok) {
    const errText = await response.text();
    logLine(ctx, source, `status=${response.status} duration=${Date.now() - reqStart}ms body="${errText}"`, 'ERROR');
    throw new Error(`AI API error: ${response.status} ${errText}`);
  }

  logLine(ctx, source, `status=${response.status} duration=${Date.now() - reqStart}ms`, 'RESP');

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content ?? '（没有收到回复）';
}
