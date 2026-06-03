import { FilteredMessage } from '../router/filter';
import { callAI } from '../ai';
import { jsonResponse } from '../response';
import { logLine, LogContext } from '../ctx';

export async function handleGroupMessage(
  filtered: FilteredMessage,
  env: Env,
  ctx: LogContext,
): Promise<Response> {
  const chatStart = Date.now();
  logLine(ctx, 'chat/group', `groupId=${filtered.groupId} text="${filtered.text}"`, 'START');

  try {
    const reply = await callAI(
      [{ role: 'user', content: filtered.text }],
      env,
      ctx,
    );
    logLine(ctx, 'chat/group', `duration=${Date.now() - chatStart}ms reply="${reply}"`, 'END');
    return jsonResponse({ reply, at_sender: true });
  } catch (err: any) {
    logLine(ctx, 'chat/group', `duration=${Date.now() - chatStart}ms err="${err?.message ?? err}"`, 'ERROR');
    return jsonResponse({ reply: 'AI 暂时繁忙，请稍后再试', at_sender: true });
  }
}
