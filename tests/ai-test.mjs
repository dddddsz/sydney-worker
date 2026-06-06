/**
 * AI API 联通性测试脚本
 *
 * 使用方法：
 *   npm run ai-test              # 运行测试
 *   node tests/ai-test.mjs       # 直接运行
 *
 * 前置条件：
 *   在 .dev.vars 或环境变量中配置 AI_BASE_URL、AI_API_KEY、AI_MODEL
 *   也可直接修改下方配置区域的值
 *
 * 执行流程：
 *   加载配置 → 发送 chat completions 请求 → 验证回复 → 输出结果
 */

import { getEnv, maskKey, logResponse } from './_shared.mjs';

const AI_BASE_URL = getEnv('AI_BASE_URL');
const AI_API_KEY = getEnv('AI_API_KEY');
const AI_MODEL = getEnv('AI_MODEL');

function log(label, msg) {
  console.log(`[ai-test.mjs] [${label}] ${msg}`);
}

if (!AI_BASE_URL) {
  log('FAIL', 'AI_BASE_URL 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}
if (!AI_MODEL) {
  log('FAIL', 'AI_MODEL 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}
if (!AI_API_KEY) {
  log('FAIL', 'AI_API_KEY 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}

const CHAT_URL = AI_BASE_URL.replace(/\/+$/, '') + '/chat/completions';

const body = {
  model: AI_MODEL,
  messages: [
    { role: 'user', content: '请回复"连接正常"这四个字，不要回复其他内容。' },
  ],
  max_tokens: 64,
};

console.log('[ai-test.mjs] AI API 联通测试');
console.log(`[ai-test.mjs] URL    ${CHAT_URL}`);
console.log(`[ai-test.mjs] Model  ${AI_MODEL}`);
console.log(`[ai-test.mjs] Key    ${maskKey(AI_API_KEY)}`);

const start = Date.now();

try {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const elapsed = Date.now() - start;
  const contentType = response.headers.get('content-type') || 'unknown';
  const text = await response.text();

  logResponse('[ai-test.mjs]', { url: CHAT_URL, status: response.status, statusText: response.statusText, elapsed, contentType, body: text });

  if (!response.ok) {
    log('FAIL', `HTTP ${response.status}`);
    process.exit(1);
  }

  if (!contentType.includes('application/json')) {
    log('FAIL', `期望 JSON 但得到 ${contentType}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    log('FAIL', '响应不是合法 JSON');
    process.exit(1);
  }

  const reply = data.choices?.[0]?.message?.content ?? '(空)';

  console.log(`[ai-test.mjs] 回复   ${reply}`);

  if (reply.includes('连接正常')) {
    log('PASS', 'AI API 连接正常');
    process.exit(0);
  } else {
    log('WARN', `返回了内容但并非预期回复: "${reply}"`);
    log('PASS', 'AI API 本身已连通');
    process.exit(0);
  }

} catch (err) {
  const elapsed = Date.now() - start;
  console.log(`[ai-test.mjs] 耗时   ${elapsed}ms`);
  log('FAIL', `请求失败: ${err.message}`);
  process.exit(1);
}
