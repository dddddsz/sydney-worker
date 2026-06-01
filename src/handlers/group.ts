import { callAI } from '../aiGateway';
import { jsonResponse } from '../response';

// 配置：只处理这个群的消息
const ALLOWED_GROUP_ID = 811759124;

/**
 * 处理群聊消息
 *
 * 过滤逻辑：
 *   1. 只处理白名单群
 *   2. 只响应 @ 了机器人的消息
 *   3. 提取纯文本后调用 AI
 *
 * @param payload - OneBot 消息事件对象
 * @param env     - Worker 环境变量
 */
export async function handleGroupMessage(payload: any, env: Env): Promise<Response> {
  const groupId = payload.group_id;
  const rawMsg = payload.raw_message;

  // 1. 群白名单过滤：只处理指定群的消息
  if (groupId !== ALLOWED_GROUP_ID) {
    console.log(`[handlers/group.ts][IGNORE] 群 ${groupId} 不在白名单内`);
    return jsonResponse({});
  }

  // 2. @检测：只响应 @ 了机器人的消息（含 @all）
  const segments = payload.message ?? [];
  const isAtMe = segments.some(
    (s: any) => s.type === 'at' && (s.data.qq === env.BOT_QQ || s.data.qq === 'all')
  );
  if (!isAtMe) {
    console.log(`[handlers/group.ts][IGNORE] 未@机器人，跳过: ${rawMsg}`);
    return jsonResponse({});
  }

  // 3. 提取纯文本内容（去掉 @、图片、表情等非文本段）
  const cleanText = segments
    .filter((s: any) => s.type === 'text')
    .map((s: any) => s.data.text)
    .join('')
    .trim();

  console.log(`[handlers/group.ts][GROUP ${groupId}] (${payload.sender.nickname})${payload.sender.card}: ${cleanText}`);

  // 调用 AI 并返回回复（带上 @ 发送者标记）
  try {
    const replyText = await callAI(
      [{ role: 'user', content: cleanText }],
      env
    );

    return jsonResponse({
      reply: replyText,
      at_sender: true,
    });
  } catch (err: any) {
    console.log(`[handlers/group.ts][GROUP ERROR] ${err?.message ?? err}`);
    return jsonResponse({
      reply: 'AI 暂时繁忙，请稍后再试',
      at_sender: true,
    });
  }
}
