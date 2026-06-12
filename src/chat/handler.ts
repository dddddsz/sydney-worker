import { FilteredMessage } from '../router/filter';
import { callAI } from '../ai';
import { MoodState, getMoodRange, computeNextMood } from '../ai/mood';
import { jsonResponse } from '../response';
import { logLine, LogContext } from '../ctx';
import { SessionStore } from '../session';

interface ChatOptions {
  type: 'private' | 'group';
  groupId?: number;
  atSender: boolean;
}

export async function storeContext(
  filtered: FilteredMessage,
  env: Env,
): Promise<void> {
  const store = new SessionStore(env.sydney_sessions);
  const sessionId = store.buildId('group', filtered.userId, filtered.groupId!);
  const displayName = filtered.card || filtered.nickname;
  await store.append(sessionId, {
    role: 'user',
    content: filtered.text,
    timestamp: Date.now(),
    name: displayName,
  });
}

export async function handleChat(
  filtered: FilteredMessage,
  env: Env,
  ctx: LogContext,
  options: ChatOptions,
): Promise<Response> {
  const chatStart = Date.now();
  const source = `chat/${options.type}`;
  const logMeta = options.type === 'group' ? `groupId=${options.groupId} text="${filtered.text}"` : `text="${filtered.text}"`;
  logLine(ctx, source, logMeta, 'START');

  try {
    const store = new SessionStore(env.sydney_sessions);
    const sessionId = store.buildId(options.type, filtered.userId, options.groupId);
    const text = filtered.text.trim();

    if (text.toLowerCase() === '/clear') {
      await store.delete(sessionId, ctx);
      logLine(ctx, source, 'session cleared', 'CMD');
      return jsonResponse({ reply: '对话记忆已清除 🧹', at_sender: options.atSender || undefined });
    }

    if (text.toLowerCase() === '/status') {
      const session = await store.get(sessionId, ctx);
      if (!session) {
        return jsonResponse({ reply: '📊 暂无对话记录，开始聊天吧', at_sender: options.atSender || undefined });
      }
      const count = session.messages.length;
      const created = new Date(session.created_at).toLocaleString('zh-CN');
      const remaining = 20 - count;
      return jsonResponse({ reply: `📊 会话状态\n  消息数：${count} 条（上限 20）\n  创建时间：${created}\n  还可记录：${remaining} 条`, at_sender: options.atSender || undefined });
    }

    const displayName = options.type === 'group'
      ? (filtered.card || filtered.nickname)
      : filtered.nickname;

    const session = await store.get(sessionId, ctx);
    const moodValue = session?.mood ?? 5;
    const mood: MoodState = { value: moodValue, range: getMoodRange(moodValue) };

    const history = await store.getContext(sessionId);

    const reply = await callAI(
      [
        ...history.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.name ? { name: m.name } : {}),
        })),
        { role: 'user', content: text, name: displayName },
      ],
      env,
      ctx,
      mood,
    );

    const now = Date.now();
    await store.append(sessionId, { role: 'user', content: text, timestamp: now, name: displayName }, ctx);
    if (reply) {
      await store.append(sessionId, { role: 'assistant', content: reply, timestamp: Date.now() }, ctx);
    }
    const newMood = computeNextMood(moodValue, reply);
    await store.updateMood(sessionId, newMood, ctx);

    logLine(ctx, source, `duration=${Date.now() - chatStart}ms reply="${reply}"`, 'END');
    const body: any = { reply };
    if (options.atSender) body.at_sender = true;
    return jsonResponse(body);
  } catch (err: any) {
    logLine(ctx, source, `duration=${Date.now() - chatStart}ms err="${err?.message ?? err}"`, 'ERROR');
    const body: any = { reply: 'AI 暂时繁忙，请稍后再试' };
    if (options.atSender) body.at_sender = true;
    return jsonResponse(body);
  }
}
