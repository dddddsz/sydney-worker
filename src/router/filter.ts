import { logLine, LogContext } from '../ctx';

export interface FilteredMessage {
  msgType: 'group' | 'private';
  text: string;
  userId: number;
  nickname: string;
  card?: string;
  groupId?: number;
  atSender: boolean;
}

const ALLOWED_GROUP_ID = 811759124;

function routeMessage(payload: any): 'group' | 'private' | null {
  const msgType = payload.message_type;
  if (msgType === 'group') return 'group';
  if (msgType === 'private') return 'private';
  return null;
}

export function isEmptyMessage(rawMsg: string): boolean {
  return !rawMsg || !rawMsg.trim();
}

export function isFriendChat(subType: string): boolean {
  return !subType || subType === 'friend';
}

export function isAllowedGroup(groupId: number, allowedId: number): boolean {
  return groupId === allowedId;
}

export function isAtBot(segments: any[], botQQ: string): boolean {
  return segments.some(
    (s: any) => s.type === 'at' && (s.data.qq === botQQ || s.data.qq === 'all'),
  );
}

export function extractText(segments: any[]): string {
  return segments
    .filter((s: any) => s.type === 'text')
    .map((s: any) => s.data.text)
    .join('')
    .trim();
}

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
    if (!isAllowedGroup(groupId, ALLOWED_GROUP_ID)) {
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
