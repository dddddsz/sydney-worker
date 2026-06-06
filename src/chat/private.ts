import { FilteredMessage } from '../router/filter';
import { callAI } from '../ai';
import { jsonResponse } from '../response';
import { logLine, LogContext } from '../ctx';
import { SessionStore } from '../session';

/**
 * 处理私聊消息
 * 将用户文本发给 AI，返回回复
 * @param filtered - 过滤后的消息对象
 * @param env      - Worker 环境变量
 * @param ctx      - 日志上下文
 */
export async function handlePrivateMessage(
  filtered: FilteredMessage,
  env: Env,
  ctx: LogContext,
): Promise<Response> {
  const chatStart = Date.now();
  logLine(ctx, 'chat/private', `text="${filtered.text}"`, 'START');

  try {
    const store = new SessionStore(env.sydney_sessions);
    const sessionId = store.buildId('private', filtered.userId);
    const text = filtered.text.trim();

    if (text.toLowerCase() === '/clear') {
      await store.delete(sessionId, ctx);
      logLine(ctx, 'chat/private', 'session cleared', 'CMD');
      return jsonResponse({ reply: '对话记忆已清除 🧹' });
    }

    if (text.toLowerCase() === '/status') {
      const session = await store.get(sessionId, ctx);
      if (!session) {
        return jsonResponse({ reply: '📊 暂无对话记录，开始聊天吧' });
      }
      const count = session.messages.length;
      const created = new Date(session.created_at).toLocaleString('zh-CN');
      const remaining = 20 - count;
      return jsonResponse({ reply: `📊 会话状态\n  消息数：${count} 条（上限 20）\n  创建时间：${created}\n  还可记录：${remaining} 条` });
    }

    const history = await store.getContext(sessionId);

    const reply = await callAI(
      [
        ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ],
      env,
      ctx,
    );

    const now = Date.now();
    await store.append(sessionId, { role: 'user', content: text, timestamp: now }, ctx);
    if (reply) {
      await store.append(sessionId, { role: 'assistant', content: reply, timestamp: Date.now() }, ctx);
    }

    logLine(ctx, 'chat/private', `duration=${Date.now() - chatStart}ms reply="${reply}"`, 'END');
    return jsonResponse({ reply });
  } catch (err: any) {
    logLine(ctx, 'chat/private', `duration=${Date.now() - chatStart}ms err="${err?.message ?? err}"`, 'ERROR');
    return jsonResponse({ reply: 'AI 暂时繁忙，请稍后再试' });
  }
}
