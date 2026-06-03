import { handle } from './guard';

/**
 * Worker 入口点
 * 接收所有 HTTP 请求，转发至守卫层处理
 */
export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    return handle(request, env);
  },
};
