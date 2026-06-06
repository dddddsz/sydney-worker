/** 工具调用前缀：以 / 或 # 开头表示工具意图 */
const TOOL_PREFIXES = ['/', '#'];

/** 聊天指令白名单：以这些开头的不算 tool，继续走 chat handler */
const CHAT_COMMANDS = ['/clear', '/status'];

/**
 * 分析用户文本意图
 * @param text - 用户输入文本
 * @returns 'tool' — 工具调用；'chat' — 普通聊天
 */
export function analyzeIntent(text: string): 'chat' | 'tool' {
  const trimmed = text.trim().toLowerCase();
  if (CHAT_COMMANDS.some((cmd) => trimmed.startsWith(cmd))) return 'chat';
  const isTool = TOOL_PREFIXES.some((p) => trimmed.startsWith(p));
  return isTool ? 'tool' : 'chat';
}
