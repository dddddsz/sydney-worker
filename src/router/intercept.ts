import { FilteredMessage } from './filter';

export function shouldIntercept(filtered: FilteredMessage, env: Env): boolean {
  const raw = (env.INTERCEPT_KEYWORDS || '').trim();
  if (!raw) return false;
  const keywords = raw.split(',').map(k => k.trim()).filter(Boolean);
  if (keywords.length === 0) return false;
  const text = filtered.text.toLowerCase();
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}
