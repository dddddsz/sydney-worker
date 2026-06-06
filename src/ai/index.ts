import { SYSTEM_PROMPT } from './prompt';
import { logLine, LogContext } from '../ctx';

/**
 * 单次 LLM API 调用
 * @param messages - 用户消息列表
 * @param baseUrl  - API 地址
 * @param apiKey   - API 密钥
 * @param model    - 模型名
 * @param ctx      - 日志上下文
 * @param reqStart - 请求开始时间（用于计算耗时）
 * @param source   - 日志来源（ai / ai/fallback）
 */
async function callProvider(
  messages: { role: string; content: string }[],
  baseUrl: string,
  apiKey: string,
  model: string,
  ctx: LogContext,
  reqStart: number,
  source: string,
): Promise<string> {
  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';

  logLine(ctx, source, `model=${model}`, 'REQ');

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    max_tokens: 1024,
  };

  logLine(ctx, source, JSON.stringify(body), 'BODY');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

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
 * @param messages - 用户消息列表
 * @param env      - Worker 环境变量
 * @param ctx      - 日志上下文
 * @returns AI 回复文本
 */
export async function callAI(
  messages: { role: string; content: string }[],
  env: Env,
  ctx: LogContext,
): Promise<string> {
  const reqStart = Date.now();

  try {
    return await callProvider(
      messages,
      env.AI_BASE_URL,
      env.AI_API_KEY,
      env.AI_MODEL,
      ctx,
      reqStart,
      'ai',
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
      );
    } catch (fallbackErr: any) {
      logLine(ctx, 'ai/fallback', `both_failed duration=${Date.now() - reqStart}ms error="${fallbackErr.message}"`, 'RETRY_FAIL');
      throw fallbackErr;
    }
  }
}
