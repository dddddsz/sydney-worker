import { logLine, LogContext } from '../ctx';
import { callProvider, ChatMessage } from './provider';

export { ChatMessage } from './provider';

/**
 * 调用外部 LLM API 获取 AI 回复
 * 首选 env.AI_*，失败后自动重试次选 env.AI_FALLBACK_*
 */
export async function callAI(
  messages: ChatMessage[],
  env: Env,
  ctx: LogContext,
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
      );
    } catch (fallbackErr: any) {
      logLine(ctx, 'ai/fallback', `both_failed duration=${Date.now() - reqStart}ms error="${fallbackErr.message}"`, 'RETRY_FAIL');
      throw fallbackErr;
    }
  }
}
