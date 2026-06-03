import { SYSTEM_PROMPT } from './prompt';
import { logLine, LogContext } from '../ctx';

export async function callAI(
  messages: { role: string; content: string }[],
  env: Env,
  ctx: LogContext,
): Promise<string> {
  const url = `${env.AI_BASE_URL}/chat/completions`;
  const reqStart = Date.now();

  logLine(ctx, 'chat/ai', `model=${env.AI_MODEL}`, 'REQ');

  const body = {
    model: env.AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    max_tokens: 1024,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    logLine(ctx, 'chat/ai', `status=${response.status} duration=${Date.now() - reqStart}ms body="${errText}"`, 'ERROR');
    throw new Error(`AI API error: ${response.status} ${errText}`);
  }

  logLine(ctx, 'chat/ai', `status=${response.status} duration=${Date.now() - reqStart}ms`, 'RESP');

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content ?? '（没有收到回复）';
}
