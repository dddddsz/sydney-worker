/**
 * 通过 AI_BASE_URL / AI_FALLBACK_BASE_URL 获取可选模型列表
 *
 * 使用方法：
 *   npm run list-models
 *   node tests/list-models.mjs
 *
 * 前置条件（环境变量）：
 *   AI_BASE_URL            来自 wrangler.jsonc 的 vars
 *   AI_FALLBACK_BASE_URL   来自 wrangler.jsonc 的 vars（可选）
 *   AI_API_KEY             来自 .dev.vars 或环境变量
 *   AI_FALLBACK_API_KEY    来自 .dev.vars 或环境变量（可选）
 */

import { getWranglerVar, getEnv, maskKey, logResponse } from './_shared.mjs';

const AI_BASE_URL = getWranglerVar('AI_BASE_URL');
const AI_FALLBACK_BASE_URL = getWranglerVar('AI_FALLBACK_BASE_URL');
const AI_API_KEY = getEnv('AI_API_KEY');
const AI_FALLBACK_API_KEY = getEnv('AI_FALLBACK_API_KEY');

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

if (!AI_BASE_URL) {
  console.log('[list-models.mjs] FAIL: AI_BASE_URL 未设置。请在环境变量中配置（对应 wrangler.jsonc 的 vars）。');
  process.exit(1);
}
if (!AI_API_KEY) {
  console.log('[list-models.mjs] FAIL: AI_API_KEY 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}

async function listModels(label, baseUrl, apiKey) {
  const url = stripTrailingSlash(baseUrl) + '/models';

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[list-models.mjs] ${label}`);
  console.log(`[list-models.mjs] URL    ${url}`);
  console.log(`[list-models.mjs] Key    ${maskKey(apiKey)}`);

  const start = Date.now();

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const elapsed = Date.now() - start;
    const contentType = response.headers.get('content-type') || 'unknown';
    const body = await response.text();

    logResponse('[list-models.mjs]', { url, status: response.status, statusText: response.statusText, elapsed, contentType, body });

    if (!response.ok) {
      console.log(`[list-models.mjs] FAIL: HTTP ${response.status} — ${label}`);
      return;
    }

    if (!contentType.includes('application/json')) {
      console.log(`[list-models.mjs] FAIL: 期望 JSON 但得到 ${contentType} — ${label}`);
      return;
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      console.log(`[list-models.mjs] FAIL: 响应不是合法 JSON — ${label}`);
      return;
    }

    const models = data.data ?? data.models ?? [];

    if (!Array.isArray(models) || models.length === 0) {
      console.log(`[list-models.mjs] ${label} — 未获取到模型列表`);
      return;
    }

    console.log('─'.repeat(60));
    for (const m of models) {
      const id = m.id ?? '?';
      const owned = m.owned_by ? `(system: ${m.owned_by})` : '';
      console.log(`  ${id.padEnd(48)} ${owned}`);
    }
    console.log('─'.repeat(60));
    console.log(`[list-models.mjs] ${label} — 共 ${models.length} 个模型`);
  } catch (err) {
    console.log(`[list-models.mjs] FAIL: ${err.message} — ${label}`);
  }
}

console.log('[list-models.mjs] 获取模型列表');

await listModels('主', AI_BASE_URL, AI_API_KEY);

if (AI_FALLBACK_BASE_URL && AI_FALLBACK_BASE_URL !== AI_BASE_URL && AI_FALLBACK_API_KEY) {
  await listModels('Fallback', AI_FALLBACK_BASE_URL, AI_FALLBACK_API_KEY);
} else {
  console.log(`\n${'─'.repeat(60)}`);
  console.log('[list-models.mjs] Fallback — 跳过（AI_FALLBACK_BASE_URL 或 AI_FALLBACK_API_KEY 未设置，或 URL 与主相同）');
}
