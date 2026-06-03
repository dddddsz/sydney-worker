/**
 * 通过 AI_BASE_URL 获取可选模型列表
 *
 * 使用方法：
 *   npm run list-models
 *   node tests/list-models.mjs
 *
 * 前置条件：
 *   在 .dev.vars 或环境变量中配置 AI_BASE_URL、AI_API_KEY
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadDotEnv(path) {
  const vars = {};
  if (!existsSync(path)) return vars;
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return vars;
}

const dotenv = loadDotEnv(resolve(root, '.dev.vars'));

function getEnv(name, fallback = '') {
  return process.env[name] ?? dotenv[name] ?? fallback;
}

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

console.log(`[list-models.mjs] 获取模型列表 (${AI_BASE_URL})`);
console.log(`[list-models.mjs] Key    ${AI_API_KEY.slice(0, 8)}...${AI_API_KEY.slice(-4)}`);

const start = Date.now();

try {
  const response = await fetch(`${AI_BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
    },
  });

  const elapsed = Date.now() - start;
  console.log(`[list-models.mjs] HTTP   ${response.status} ${response.statusText} (${elapsed}ms)`);

  if (!response.ok) {
    const text = await response.text();
    console.log(`[list-models.mjs] FAIL: ${text}`);
    process.exit(1);
  }

  const data = await response.json();
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
