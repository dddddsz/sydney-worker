import { FilteredMessage } from '../router/filter';
import { LogContext } from '../ctx';
import { handleChat } from './handler';

export async function handlePrivateMessage(
  filtered: FilteredMessage,
  env: Env,
  ctx: LogContext,
): Promise<Response> {
  return handleChat(filtered, env, ctx, { type: 'private' });
}
