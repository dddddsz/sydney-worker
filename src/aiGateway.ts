/**
 * AI API 网关 —— 封装对 OpenAI 兼容 API 的调用
 *
 * 拼接 system prompt + 用户消息，请求 chat completions 接口并返回回复文本。
 */
import { SYSTEM_PROMPT } from '../prompts/newbing';

/**
 * 调用 AI 模型
 *
 * @param messages - 用户消息历史（不含 system prompt，会自动拼接）
 * @param env      - Worker 环境变量（AI_BASE_URL、AI_MODEL、AI_API_KEY）
 * @returns AI 回复文本
 */
export async function callAI(
  messages: { role: string; content: string }[],
  env: Env
): Promise<string> {
  const url = `${env.AI_BASE_URL}/chat/completions`;

  const body = {
    model: env.AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    max_tokens: 1024,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content ?? '（没有收到回复）';
}
