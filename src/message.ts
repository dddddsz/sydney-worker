import { handleGroupMessage } from './handlers/group';
import { handlePrivateMessage } from './handlers/private';

/**
 * 处理 QQ 消息事件 —— 路由分发
 *
 * 按 message_type 将消息分发给对应的 handler：
 *   - group   → handleGroupMessage（handlers/group.ts）
 *   - private → handlePrivateMessage（handlers/private.ts）
 *
 * @param payload - OneBot 消息事件对象
 * @param env     - Worker 环境变量
 */
export async function handleMessage(payload: any, env: Env): Promise<Response> {
  const msgType = payload.message_type; // 'group' | 'private'

  if (msgType === 'group') {
    return handleGroupMessage(payload, env);
  }

  if (msgType === 'private') {
    return handlePrivateMessage(payload, env);
  }

  // 非群聊非私聊（如临时会话、讨论组等）：不做任何操作
  return new Response(JSON.stringify({}), {
    headers: { 'Content-Type': 'application/json' },
  });
}
