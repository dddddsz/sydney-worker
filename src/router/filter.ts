import { logLine, LogContext } from '../ctx';

/**
 * 过滤后的消息结构
 * 包含消息类型、文本、用户信息、群信息等
 */
export interface FilteredMessage {
  msgType: 'group' | 'private';
  text: string;
  userId: number;
  nickname: string;
  card?: string;
  groupId?: number;
  atSender: boolean;
}

/**
 * 判断消息类型：私聊 / 群聊 / 未知
 * @param payload - 原始消息体
 */
function routeMessage(payload: any): 'group' | 'private' | null {
  const msgType = payload.message_type;
  if (msgType === 'group') return 'group';
  if (msgType === 'private') return 'private';
  return null;
}

/** 检查原始消息是否为空 */
export function isEmptyMessage(rawMsg: string): boolean {
  return !rawMsg || !rawMsg.trim();
}

/** 检查是否为好友私聊 */
export function isFriendChat(subType: string): boolean {
  return !subType || subType === 'friend';
}

/** 检查群号是否在允许列表中 */
export function isAllowedGroup(groupId: number, allowedId: number): boolean {
  return groupId === allowedId;
}

/** 检查消息中是否有 @机器人 或 @全体成员 的 CQ 码段 */
export function isAtBot(segments: any[], botQQ: string): boolean {
  return segments.some(
    (s: any) => s.type === 'at' && (s.data.qq === botQQ || s.data.qq === 'all'),
  );
}

/** 从 CQ 码段列表中提取纯文本内容 */
export function extractText(segments: any[]): string {
  return segments
    .filter((s: any) => s.type === 'text')
    .map((s: any) => s.data.text)
    .join('')
    .trim();
}

/**
 * 消息过滤主逻辑
 * 校验消息类型 → 私聊: 非空+好友 → 群聊: 白名单+@机器人
 * 通过后返回 FilteredMessage，否则返回 null
 * @param payload - 原始消息体
 * @param env     - Worker 环境变量（含 BOT_QQ、ALLOWED_GROUP_ID）
 * @param ctx     - 日志上下文
 */
export function filterMessage(
  payload: any,
  env: Env,
  ctx: LogContext,
): FilteredMessage | null {
  const msgType = routeMessage(payload);
  if (!msgType) {
    logLine(ctx, 'router/filter', '未知消息类型，跳过', 'IGNORE');
    return null;
  }

  if (msgType === 'private') {
    const rawMsg = payload.raw_message;
    if (isEmptyMessage(rawMsg)) {
      logLine(ctx, 'router/filter', '空消息，跳过', 'IGNORE');
      return null;
    }
    if (!isFriendChat(payload.sub_type)) {
      logLine(ctx, 'router/filter', `非好友私聊 sub_type=${payload.sub_type}，跳过`, 'IGNORE');
      return null;
    }
    return {
      msgType: 'private',
      text: rawMsg,
      userId: payload.user_id,
      nickname: payload.sender.nickname,
      atSender: false,
    };
  }

  if (msgType === 'group') {
    const groupId = payload.group_id;
    const allowedGroupId = Number(env.ALLOWED_GROUP_ID);
    if (!isAllowedGroup(groupId, allowedGroupId)) {
      logLine(ctx, 'router/filter', `群 ${groupId} 不在白名单内`, 'IGNORE');
      return null;
    }
    const segments = payload.message ?? [];
    if (!isAtBot(segments, env.BOT_QQ)) {
      logLine(ctx, 'router/filter', `未@机器人，跳过: ${payload.raw_message}`, 'IGNORE');
      return null;
    }
    const cleanText = extractText(segments);
    return {
      msgType: 'group',
      text: cleanText,
      userId: payload.user_id,
      nickname: payload.sender.nickname,
      card: payload.sender.card,
      groupId,
      atSender: true,
    };
  }

  return null;
}
