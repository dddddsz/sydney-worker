/**
 * AI API 联通性测试脚本
 *
 * 使用方法：
 *   npm run ai-test              # 运行测试
 *   node tests/ai-test.mjs       # 直接运行
 *
 * 前置条件（环境变量）：
 *   AI_BASE_URL            来自 wrangler.jsonc 的 vars
 *   AI_MODEL               来自 wrangler.jsonc 的 vars
 *   AI_FALLBACK_BASE_URL   来自 wrangler.jsonc 的 vars（可选）
 *   AI_FALLBACK_MODEL      来自 wrangler.jsonc 的 vars（可选）
 *   AI_API_KEY             来自 .dev.vars 或环境变量
 *   AI_FALLBACK_API_KEY    来自 .dev.vars 或环境变量（可选）
 *
 * 执行流程：
 *   阶段 1: 主        → AI_BASE_URL + AI_MODEL + AI_API_KEY
 *   阶段 2: Fallback  → AI_FALLBACK_BASE_URL + AI_FALLBACK_MODEL + AI_FALLBACK_API_KEY
 */

import { getWranglerVar, getEnv, maskKey, logResponse } from './_shared.mjs';

const AI_BASE_URL = getWranglerVar('AI_BASE_URL');
const AI_FALLBACK_BASE_URL = getWranglerVar('AI_FALLBACK_BASE_URL');
const AI_MODEL = getWranglerVar('AI_MODEL');
const AI_FALLBACK_MODEL = getWranglerVar('AI_FALLBACK_MODEL');
const AI_API_KEY = getEnv('AI_API_KEY');
const AI_FALLBACK_API_KEY = getEnv('AI_FALLBACK_API_KEY');

function log(label, msg) {
  console.log(`[ai-test.mjs] [${label}] ${msg}`);
}

if (!AI_BASE_URL) {
  log('FAIL', 'AI_BASE_URL 未设置。请在环境变量中配置（对应 wrangler.jsonc 的 vars）。');
  process.exit(1);
}
if (!AI_MODEL) {
  log('FAIL', 'AI_MODEL 未设置。请在环境变量中配置（对应 wrangler.jsonc 的 vars）。');
  process.exit(1);
}
if (!AI_API_KEY) {
  log('FAIL', 'AI_API_KEY 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

async function testChat(label, baseUrl, modelName, apiKey) {
  const url = stripTrailingSlash(baseUrl) + '/chat/completions';
  const body = {
    model: modelName,
    messages: [
      { role: 'user', content: '请回复"连接正常"这四个字，不要回复其他内容。' },
    ],
    max_tokens: 64,
  };

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[ai-test.mjs] 阶段: ${label}`);
  console.log(`[ai-test.mjs] URL    ${url}`);
  console.log(`[ai-test.mjs] Model  ${modelName}`);
  console.log(`[ai-test.mjs] Key    ${maskKey(apiKey)}`);

  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - start;
    const contentType = response.headers.get('content-type') || 'unknown';
    const text = await response.text();

    logResponse('[ai-test.mjs]', { url, status: response.status, statusText: response.statusText, elapsed, contentType, body: text });

    if (!response.ok) {
      log('WARN', `HTTP ${response.status} — ${label}`);
      return false;
    }

    if (!contentType.includes('application/json')) {
      log('WARN', `期望 JSON 但得到 ${contentType} — ${label}`);
      return false;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      log('WARN', `响应不是合法 JSON — ${label}`);
      return false;
    }

    const reply = data.choices?.[0]?.message?.content ?? '(空)';
    console.log(`[ai-test.mjs] 回复   ${reply}`);

    if (reply.includes('连接正常')) {
      log('PASS', `${label} — 连接正常`);
      return true;
    } else {
      log('WARN', `返回了内容但并非预期回复: "${reply}" — ${label}`);
      return true;
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`[ai-test.mjs] 耗时   ${elapsed}ms`);
    log('WARN', `请求失败: ${err.message} — ${label}`);
    return false;
  }
}

console.log('[ai-test.mjs] AI API 联通测试');
console.log('[ai-test.mjs] 按 Ctrl+C 可随时中断');

let pass = 0;
let fail = 0;

const results = [];

// Stage 1: Primary
const r1 = await testChat('主', AI_BASE_URL, AI_MODEL, AI_API_KEY);
r1 ? pass++ : fail++;
results.push({ label: '主', passed: r1 });

// Stage 2: Fallback
if (AI_FALLBACK_BASE_URL && AI_FALLBACK_MODEL && AI_FALLBACK_API_KEY &&
    (AI_FALLBACK_BASE_URL !== AI_BASE_URL || AI_FALLBACK_MODEL !== AI_MODEL || AI_FALLBACK_API_KEY !== AI_API_KEY)) {
  const r2 = await testChat('Fallback', AI_FALLBACK_BASE_URL, AI_FALLBACK_MODEL, AI_FALLBACK_API_KEY);
  r2 ? pass++ : fail++;
  results.push({ label: 'Fallback', passed: r2 });
} else {
  console.log(`\n${'─'.repeat(60)}`);
  console.log('[ai-test.mjs] 阶段: Fallback — 跳过（AI_FALLBACK_BASE_URL、AI_FALLBACK_MODEL 或 AI_FALLBACK_API_KEY 未设置，或全部与主值相同）');
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`[ai-test.mjs] 结果: ${pass}/${pass + fail} 通过`);
for (const r of results) {
  console.log(`[ai-test.mjs]   ${r.passed ? 'PASS' : 'WARN'}  ${r.label}`);
}
if (fail > 0) {
  log('WARN', `${fail} 个阶段失败（非致命，不代表全部不可用）`);
  process.exit(1);
} else {
  log('PASS', '所有阶段通过');
  process.exit(0);
}
