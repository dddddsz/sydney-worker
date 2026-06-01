import { callAI } from './aiGateway';

// 配置：只处理这个群的消息
const ALLOWED_GROUP_ID = 811759124;

/**
 * 处理 QQ 消息事件
 *
 * 解析 OneBot 消息 payload，按群聊/私聊分别过滤后调用 AI 回复：
 *   - 群聊：仅响应白名单群内的 @ 消息，提取纯文本后调用 AI
 *   - 私聊：过滤空消息和非好友会话后直接调用 AI
 *
 * @param payload - OneBot 消息事件对象
 * @param env     - Worker 环境变量（含 TOKEN、BOT_QQ、AI 相关配置）
 */
export async function handleMessage(payload: any, env: Env): Promise<Response> {
  const msgType = payload.message_type; // 'group' | 'private'
  const rawMsg = payload.raw_message;

  // ---- 群聊消息处理 ----
  if (msgType === 'group') {
    const groupId = payload.group_id;

    // 1. 群白名单过滤：只处理指定群的消息
    if (groupId !== ALLOWED_GROUP_ID) {
      console.log(`！！payload层:[IGNORE] 群 ${groupId} 不在白名单内`);
      return jsonResponse({});
    }

    // 2. @检测：只响应 @ 了机器人的消息（含 @all）
    const segments = payload.message ?? [];
    const isAtMe = segments.some(
      (s: any) => s.type === 'at' && (s.data.qq === env.BOT_QQ || s.data.qq === 'all')
    );
    if (!isAtMe) {
      console.log(`！！payload层:[IGNORE] 未@机器人，跳过: ${rawMsg}`);
      return jsonResponse({});
    }

    // 3. 提取纯文本内容（去掉 @、图片、表情等非文本段）
    const cleanText = segments
      .filter((s: any) => s.type === 'text')
      .map((s: any) => s.data.text)
      .join('')
      .trim();

    console.log(`！！payload层:[GROUP ${groupId}] (${payload.sender.nickname})${payload.sender.card}: ${cleanText}`);

    // 调用 AI 并返回回复（带上 @ 发送者标记）
    try {
      const replyText = await callAI(
        [{ role: 'user', content: cleanText }],
        env
      );

      return jsonResponse({
        reply: replyText,
        at_sender: true, // 让机器人回复时 @ 发送者
      });
    } catch (err: any) {
      console.log(`！！payload层:[GROUP ERROR] ${err?.message ?? err}`);
      return jsonResponse({
        reply: 'AI 暂时繁忙，请稍后再试',
        at_sender: true,
      });
    }
  }

  // ---- 私聊消息处理 ----
  else if (msgType === 'private') {
    // 过滤空消息（部分协议实现可能携带空消息作为心跳/状态提示）
    if (!rawMsg || !rawMsg.trim()) {
      console.log(`！！payload层:[IGNORE] 空消息，跳过`);
      return jsonResponse({});
    }

    // 只响应好友私聊，忽略临时会话、群临时消息、陌生人等
    if (payload.sub_type && payload.sub_type !== 'friend') {
      console.log(`！！payload层:[IGNORE] 非好友私聊 (sub_type=${payload.sub_type})，跳过`);
      return jsonResponse({});
    }

    console.log(`！！payload层:[PRIVATE ${payload.user_id}]${payload.sender.nickname}: ${rawMsg}`);

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
      console.log(`！！payload层:[PRIVATE ERROR] ${err?.message ?? err}`);
      return jsonResponse({
        reply: 'AI 暂时繁忙，请稍后再试',
      });
    }
  }

  // 非群聊非私聊（如临时会话、讨论组等）：不做任何操作
  return jsonResponse({});
}

/**
 * 统一构造 JSON 格式的 HTTP 响应
 * @param data - 响应体对象
 */
function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}