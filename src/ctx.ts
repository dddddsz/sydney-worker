export interface LogContext {
  requestId: string;
  startTime: number;
}

export function createLogContext(): LogContext {
  const requestId = Math.random().toString(36).substring(2, 8);
  return { requestId, startTime: Date.now() };
}

export function elapsed(ctx: LogContext): string {
  return `${Date.now() - ctx.startTime}ms`;
}

export function logLine(
  ctx: LogContext,
  source: string,
  message: string,
  event?: string,
): void {
  const eventTag = event ? `[${event}]` : '';
  console.log(`[req:${ctx.requestId}] [${source}]${eventTag} ${message}`);
}
