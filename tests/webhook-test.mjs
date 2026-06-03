/**
 * Napcat Webhook 连通性测试
 *
 * 使用方式：
 *   先终端 1: npx wrangler dev（wrangler dev）
 *   再终端 2: npm run test-webhook
 *
 * 前置条件：
 *   - .dev.vars 中配置了 TOKEN（与 wrangler.jsonc 中的签名密钥一致）
 *   - wrangler dev 已在 http://localhost:8787 运行
 *
 * 测试内容：
 *   - 若无签名头 → 403
 *   - 若签名内容错误 → 403
 *   - 若签名正确 → 200
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// 从 .dev.vars 加载环境变量
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

const TOKEN = getEnv('TOKEN');
const BASE_URL = getEnv('WORKER_URL');

// 前置检查：TOKEN 必须存在
if (!TOKEN) {
  console.error('[webhook-test.mjs] [FAIL] TOKEN 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}
if (!BASE_URL) {
  console.error('[webhook-test.mjs] [FAIL] WORKER_URL 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}

// 用 Node.js crypto 计算 HMAC-SHA1（比 Web Crypto API 更简洁）
function computeSignature(body, key) {
  return crypto.createHmac('sha1', key).update(body).digest('hex');
}

console.log('[webhook-test.mjs] Napcat Webhook 测试');
console.log(`[webhook-test.mjs] Worker: ${BASE_URL}`);

// 构造 OneBot 消息事件体（群聊 @ 消息示例）
const onebotPayload = JSON.stringify({
  post_type: 'message',
  message_type: 'group',
  group_id: 811759124,
  raw_message: '你好',
  message: [
    { type: 'at', data: { qq: '3794405255' } },
    { type: 'text', data: { text: '你好' } },
  ],
  sender: { nickname: '测试', card: '测试', user_id: 123456 },
});

// 测试用例
const tests = [
  {
    name: '若无签名头 → 403',
    async run() {
      const res = await fetch(BASE_URL, { method: 'POST', body: '{}' });
      if (res.status !== 403) {
        throw new Error(`期望 403，实际 ${res.status}`);
      }
    },
  },
  {
    name: '签名内容错误 → 403',
    async run() {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Signature': 'sha1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
        body: '{}',
      });
      if (res.status !== 403) {
        throw new Error(`期望 403，实际 ${res.status}`);
      }
    },
  },
  {
    name: '若签名正确 → 200',
    async run() {
      const sig = computeSignature(onebotPayload, TOKEN);
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Signature': `sha1=${sig}` },
        body: onebotPayload,
      });
      if (res.status !== 200) {
        const text = await res.text().catch(() => '');
        throw new Error(`期望 200，实际 ${res.status}${text ? ` — ${text}` : ''}`);
      }
    },
  },
];

let pass = 0;
let fail = 0;

for (const { name, run } of tests) {
  try {
    await run();
    console.log(`[webhook-test.mjs] [PASS] ${name}`);
    pass++;
  } catch (err) {
    console.log(`[webhook-test.mjs] [FAIL] ${name} — ${err.message}`);
    fail++;
  }
}

console.log(`[webhook-test.mjs] 结果: ${pass}/${tests.length} 通过`);
if (fail > 0) {
  console.log(`[webhook-test.mjs] [FAIL] ${fail} 个失败`);
  process.exit(1);
} else {
  console.log('[webhook-test.mjs] [PASS] 全部通过');
  process.exit(0);
}
