import { callAI } from '../aiGateway';
import { jsonResponse } from '../response';

/**
 * 处理私聊消息
 *
 * 过滤逻辑：
 *   1. 过滤空消息（部分协议实现可能携带空消息作为心跳/状态提示）
 *   2. 只响应好友私聊，忽略临时会话等
 *   3. 直接调用 AI
 *
 * @param payload - OneBot 消息事件对象
 * @param env     - Worker 环境变量
 */
export async function handlePrivateMessage(payload: any, env: Env): Promise<Response> {
  const rawMsg = payload.raw_message;

  // 1. 过滤空消息
  if (!rawMsg || !rawMsg.trim()) {
    console.log(`[handlers/private.ts][IGNORE] 空消息，跳过`);
    return jsonResponse({});
  }

  // 2. 只响应好友私聊，忽略临时会话、群临时消息、陌生人等
  if (payload.sub_type && payload.sub_type !== 'friend') {
    console.log(`[handlers/private.ts][IGNORE] 非好友私聊 (sub_type=${payload.sub_type})，跳过`);
    return jsonResponse({});
  }

  console.log(`[handlers/private.ts][PRIVATE ${payload.user_id}]${payload.sender.nickname}: ${rawMsg}`);

  // 调用 AI 并返回回复（私聊无需 @）
  try {
    const replyText = await callAI(
      [{ role: 'user', content: rawMsg }],
      env
    );

    return jsonResponse({
      reply: replyText,
    });
  } catch (err: any) {
    console.log(`[handlers/private.ts][PRIVATE ERROR] ${err?.message ?? err}`);
    return jsonResponse({
      reply: 'AI 暂时繁忙，请稍后再试',
    });
  }
}
