/**
 * Napcat Webhook 连通性测试
 *
 * 使用方式：
 *   1. 终端 1: npx wrangler dev
 *   2. 终端 2: npm run test-webhook
 *
 * 前置条件：
 *   - .dev.vars 中配置了 TOKEN（与 wrangler.jsonc 中的签名密钥一致）
 *   - wrangler dev 已在 http://localhost:8787 运行
 *
 * 测试内容：
 *   - 无签名头 → 403
 *   - 签名内容错误 → 403
 *   - 签名正确 → 200
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
const BASE_URL = process.env.WORKER_URL || 'http://localhost:8787';

// 前置检查：TOKEN 必须存在
if (!TOKEN) {
  console.error('\n  TOKEN 未设置。请在 .dev.vars 或环境变量中配置。\n');
  process.exit(1);
}

// 用 Node.js crypto 计算 HMAC-SHA1（比 Web Crypto API 更简洁）
function computeSignature(body, key) {
  return crypto.createHmac('sha1', key).update(body).digest('hex');
}

// 终端颜色
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const CYAN  = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`\n${CYAN}══════════════ Napcat Webhook 测试 ══════════════${RESET}\n`);
console.log(`  Worker: ${BASE_URL}\n`);

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
    name: '无签名头 → 403',
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
    name: '签名正确 → 200',
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
    console.log(`  ${GREEN}✓${RESET} ${name}`);
    pass++;
  } catch (err) {
    console.log(`  ${RED}✗${RESET} ${name} — ${err.message}`);
    fail++;
  }
}

console.log(`\n${CYAN}════════════════════════════════════════════${RESET}`);
console.log(`  结果: ${pass}/${tests.length} 通过`);
if (fail > 0) {
  console.log(`  ${RED}${fail} 个失败${RESET}`);
  process.exit(1);
} else {
  console.log(`  ${GREEN}全部通过 ✓${RESET}\n`);
  process.exit(0);
}
