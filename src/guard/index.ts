import { parseWebhook } from './webhook';
import { verifySignature } from './auth';
import { handle as handleRouter } from '../router';
import { jsonResponse } from '../response';
import { createLogContext, elapsed, logLine } from '../ctx';

/**
 * 守卫层入口
 * 解析 Webhook → 验证签名 → 非消息事件直接返回 → 转路由层
 * @param request - 原始 HTTP 请求
 * @param env     - Worker 环境变量
 */
export async function handle(request: Request, env: Env): Promise<Response> {
  const ctx = createLogContext();
  logLine(ctx, 'guard', 'method=POST', 'START');

  try {
    const { payload, rawBody, receivedHex } = await parseWebhook(request);

    const valid = await verifySignature(rawBody, env.TOKEN, receivedHex, ctx);
    if (!valid) {
      logLine(ctx, 'guard', `signature=mismatch status=403 duration=${elapsed(ctx)}`, 'END');
      return new Response('signature mismatch', { status: 403 });
    }

    if (payload.post_type !== 'message') {
      logLine(ctx, 'guard', `post_type=${payload.post_type} status=200 duration=${elapsed(ctx)}`, 'END');
      return jsonResponse({});
    }

    const response = await handleRouter(payload, env, ctx);
    logLine(ctx, 'guard', `status=${response.status} duration=${elapsed(ctx)}`, 'END');
    return response;
  } catch (e: any) {
    if (e.message === 'Method Not Allowed') {
      logLine(ctx, 'guard', `method=not-allowed status=405 duration=${elapsed(ctx)}`, 'END');
      return new Response('Method Not Allowed', { status: 405 });
    }
    if (e.message === 'missing signature') {
      logLine(ctx, 'guard', `signature=missing status=403 duration=${elapsed(ctx)}`, 'END');
      return new Response('missing signature', { status: 403 });
    }
    logLine(ctx, 'guard', `error="${e.message}" duration=${elapsed(ctx)}`, 'ERROR');
    return jsonResponse({});
  }
}
