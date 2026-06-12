import { buildSystemPrompt } from './prompt';
import { MoodState } from './mood';
import { logLine, LogContext } from '../ctx';

export interface ChatMessage {
  role: string;
  content: string;
  name?: string;
}

/**
 * 单次 LLM API 调用
 */
async function callProvider(
  messages: ChatMessage[],
  baseUrl: string,
  apiKey: string,
  model: string,
  ctx: LogContext,
  reqStart: number,
  source: string,
  timeout: number,
  mood: MoodState,
): Promise<string> {
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  logLine(ctx, source, `model=${model} mood=${mood.value}(${mood.range})`, 'REQ');

  const body = {
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(mood) },
      ...messages,
    ],
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

/**
 * 调用外部 LLM API 获取 AI 回复
 * 首选 env.AI_*，失败后自动重试次选 env.AI_FALLBACK_*
 */
export async function callAI(
  messages: ChatMessage[],
  env: Env,
  ctx: LogContext,
  mood: MoodState,
): Promise<string> {
  const reqStart = Date.now();
  const timeout = Number(env.AI_TIMEOUT) || 25000;

  try {
    return await callProvider(
      messages,
      env.AI_BASE_URL,
      env.AI_API_KEY,
      env.AI_MODEL,
      ctx,
      reqStart,
      'ai',
      timeout,
      mood,
    );
  } catch (primaryErr: any) {
    logLine(ctx, 'ai', `fallback_reason="${primaryErr.message}" duration=${Date.now() - reqStart}ms`, 'FALLBACK');

    try {
      return await callProvider(
        messages,
        env.AI_FALLBACK_BASE_URL,
        env.AI_FALLBACK_API_KEY,
        env.AI_FALLBACK_MODEL,
        ctx,
        Date.now(),
        'ai/fallback',
        timeout,
        mood,
      );
    } catch (fallbackErr: any) {
      logLine(ctx, 'ai/fallback', `both_failed duration=${Date.now() - reqStart}ms error="${fallbackErr.message}"`, 'RETRY_FAIL');
      throw fallbackErr;
    }
  }
}
