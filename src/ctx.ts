/**
 * 日志上下文
 * 在一次请求生命周期内传递，保证所有日志共享同一 requestId
 */
export interface LogContext {
  requestId: string;
  startTime: number;
}

/**
 * 创建日志上下文，生成随机 requestId
 */
export function createLogContext(): LogContext {
  const requestId = Math.random().toString(36).substring(2, 8);
  return { requestId, startTime: Date.now() };
}

/**
 * 计算从请求开始到当前时刻的耗时
 */
export function elapsed(ctx: LogContext): string {
  return `${Date.now() - ctx.startTime}ms`;
}

/**
 * 输出结构化日志
 * 格式: [req:{id}] [{source}][{event}] key=value ...
 * @param ctx     - 日志上下文
 * @param source  - 来源模块，如 guard、ai
 * @param message - 日志正文（key=value 形式）
 * @param event   - 事件类型（可选），如 START、END、ERROR
 */
export function logLine(
  ctx: LogContext,
  source: string,
  message: string,
  event?: string,
): void {
  const eventTag = event ? `[${event}]` : '';
  console.log(`[req:${ctx.requestId}] [${source}]${eventTag} ${message}`);
}
