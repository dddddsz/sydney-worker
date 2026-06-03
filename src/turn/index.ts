export interface TurnRecord {
  requestId: string;
  userId: number;
  msgType: 'group' | 'private';
  text: string;
  reply: string;
  duration: number;
  error?: string;
}

export function archiveTurn(record: TurnRecord): void {
  console.log(
    `[turn][ARCHIVE] requestId=${record.requestId} userId=${record.userId} type=${record.msgType} ` +
    `duration=${record.duration}ms error=${record.error ?? 'none'}`,
  );
}
