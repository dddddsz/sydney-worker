import { FilteredMessage } from '../router/filter';
import { callAI } from '../ai';
import { jsonResponse } from '../response';
import { logLine, LogContext } from '../ctx';

export async function handlePrivateMessage(
  filtered: FilteredMessage,
  env: Env,
  ctx: LogContext,
): Promise<Response> {
  const chatStart = Date.now();
  logLine(ctx, 'chat/private', `text="${filtered.text}"`, 'START');

  try {
    const reply = await callAI(
      [{ role: 'user', content: filtered.text }],
      env,
      ctx,
    );
    logLine(ctx, 'chat/private', `duration=${Date.now() - chatStart}ms reply="${reply}"`, 'END');
    return jsonResponse({ reply });
  } catch (err: any) {
    logLine(ctx, 'chat/private', `duration=${Date.now() - chatStart}ms err="${err?.message ?? err}"`, 'ERROR');
    return jsonResponse({ reply: 'AI 暂时繁忙，请稍后再试' });
  }
}
