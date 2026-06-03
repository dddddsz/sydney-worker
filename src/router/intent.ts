/** 工具调用前缀：以 / 或 # 开头表示工具意图 */
const TOOL_PREFIXES = ['/', '#'];

/**
 * 分析用户文本意图
 * @param text - 用户输入文本
 * @returns 'tool' — 工具调用；'chat' — 普通聊天
 */
export function analyzeIntent(text: string): 'chat' | 'tool' {
  const trimmed = text.trim();
  const isTool = TOOL_PREFIXES.some((p) => trimmed.startsWith(p));
  return isTool ? 'tool' : 'chat';
}
