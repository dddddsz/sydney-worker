const TOOL_PREFIXES = ['/', '#'];

export function analyzeIntent(text: string): 'chat' | 'tool' {
  const trimmed = text.trim();
  const isTool = TOOL_PREFIXES.some((p) => trimmed.startsWith(p));
  return isTool ? 'tool' : 'chat';
}
