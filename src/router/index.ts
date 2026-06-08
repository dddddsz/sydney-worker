import { filterMessage } from './filter';
import { shouldIntercept } from './intercept';
import { analyzeIntent } from './intent';
import { handlePrivateMessage } from '../chat/private';
import { handleGroupMessage } from '../chat/group';
import { storeContext } from '../chat/handler';
import { jsonResponse } from '../response';
import { logLine, LogContext } from '../ctx';

/**
 * 路由层入口
 * 消息过滤 → 意图识别 → 分发至私聊/群聊处理器
 * @param payload - 解析后的 Webhook 消息体
 * @param env     - Worker 环境变量
 * @param ctx     - 日志上下文
 * @param execCtx - Worker ExecutionContext（用于 waitUntil）
 */
export async function handle(payload: any, env: Env, ctx: LogContext, execCtx: ExecutionContext): Promise<Response> {
  const filtered = filterMessage(payload, env, ctx);
  if (!filtered) {
    return jsonResponse({});
  }

  const intent = analyzeIntent(filtered.text);
  logLine(ctx, 'router', `type=${filtered.msgType} userId=${filtered.userId} intent=${intent} text="${filtered.text}"`);

  if (intent === 'tool') {
    return jsonResponse({ reply: '工具功能暂未开放' });
  }

  if (filtered.msgType === 'private') {
    return handlePrivateMessage(filtered, env, ctx);
  }

  // --- 群聊 ---
  if (filtered.isAtBot) {
    return handleGroupMessage(filtered, env, ctx, true);
  }

  if (shouldIntercept(filtered, env)) {
    return handleGroupMessage(filtered, env, ctx, true);
  }

  execCtx.waitUntil(storeContext(filtered, env));
  return jsonResponse({});
}
