/**
 * 通过 AI_BASE_URL 获取可选模型列表
 *
 * 使用方法：
 *   npm run list-models
 *   node tests/list-models.mjs
 *
 * 前置条件：
 *   在 .dev.vars 或环境变量中配置 AI_BASE_URL、AI_API_KEY
 *   也可直接修改下方配置区域的值
 */

import { getEnv, maskKey, logResponse } from './_shared.mjs';

const AI_BASE_URL = getEnv('AI_BASE_URL');
const AI_API_KEY = getEnv('AI_API_KEY');

if (!AI_BASE_URL) {
  console.log('[list-models.mjs] FAIL: AI_BASE_URL 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}
if (!AI_API_KEY) {
  console.log('[list-models.mjs] FAIL: AI_API_KEY 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}

const MODELS_URL = AI_BASE_URL.replace(/\/+$/, '') + '/models';

console.log(`[list-models.mjs] 获取模型列表`);
console.log(`[list-models.mjs] URL    ${MODELS_URL}`);
console.log(`[list-models.mjs] Key    ${maskKey(AI_API_KEY)}`);

const start = Date.now();

try {
  const response = await fetch(MODELS_URL, {
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
    },
  });

  const elapsed = Date.now() - start;
  const contentType = response.headers.get('content-type') || 'unknown';
  const body = await response.text();

  logResponse('[list-models.mjs]', { url: MODELS_URL, status: response.status, statusText: response.statusText, elapsed, contentType, body });

  if (!response.ok) {
    console.log(`[list-models.mjs] FAIL: HTTP ${response.status}`);
    process.exit(1);
  }

  if (!contentType.includes('application/json')) {
    console.log(`[list-models.mjs] FAIL: 期望 JSON 但得到 ${contentType}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    console.log(`[list-models.mjs] FAIL: 响应不是合法 JSON`);
    process.exit(1);
  }

  const models = data.data ?? data.models ?? [];

  if (!Array.isArray(models) || models.length === 0) {
    console.log('[list-models.mjs] 未获取到模型列表');
    process.exit(0);
  }

  console.log('─'.repeat(60));
  for (const m of models) {
    const id = m.id ?? '?';
    const owned = m.owned_by ? `(system: ${m.owned_by})` : '';
    console.log(`  ${id.padEnd(48)} ${owned}`);
  }
  console.log('─'.repeat(60));
  console.log(`[list-models.mjs] 共 ${models.length} 个模型`);

} catch (err) {
  console.log(`[list-models.mjs] FAIL: ${err.message}`);
  process.exit(1);
}
