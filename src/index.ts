import { handle } from './guard';

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    return handle(request, env);
  },
};
