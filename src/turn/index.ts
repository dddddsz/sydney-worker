/**
 * 单次交互记录
 * 记录请求 → 回复的完整链路，用于归档和分析
 */
export interface TurnRecord {
  requestId: string;
  userId: number;
  msgType: 'group' | 'private';
  text: string;
  reply: string;
  duration: number;
  error?: string;
}

/**
 * 归档一次交互记录到日志
 * @param record - 交互记录
 */
export function archiveTurn(record: TurnRecord): void {
  console.log(
    `[turn][ARCHIVE] requestId=${record.requestId} userId=${record.userId} type=${record.msgType} ` +
    `duration=${record.duration}ms error=${record.error ?? 'none'}`,
  );
}
