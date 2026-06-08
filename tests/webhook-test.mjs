/**
 * Napcat Webhook 连通性测试
 *
 * 使用方式：
 *   先终端 1: npx wrangler dev（wrangler dev）
 *   再终端 2: npm run test-webhook
 *
 * 前置条件（环境变量）：
 *   TOKEN        来自 .dev.vars 或环境变量（对应 wrangler 的 secret）
 *   WORKER_URL   来自环境变量（如 http://localhost:8787）
 *   wrangler dev 已在 WORKER_URL 运行
 *
 * 测试内容：
 *   - 若无签名头 → 403
 *   - 若签名内容错误 → 403
 *   - 若签名正确 → 200
 */

import { getEnv } from './_shared.mjs';
import crypto from 'crypto';

const TOKEN = getEnv('TOKEN');
const BASE_URL = getEnv('WORKER_URL');

if (!TOKEN) {
  console.error('[webhook-test.mjs] [FAIL] TOKEN 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}
if (!BASE_URL) {
  console.error('[webhook-test.mjs] [FAIL] WORKER_URL 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}

function computeSignature(body, key) {
  return crypto.createHmac('sha1', key).update(body).digest('hex');
}

console.log('[webhook-test.mjs] Napcat Webhook 测试');
console.log(`[webhook-test.mjs] Worker: ${BASE_URL}`);

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

async function fetchWithLog(label, url, opts) {
  const start = Date.now();
  const res = await fetch(url, opts);
  const elapsed = Date.now() - start;
  const contentType = res.headers.get('content-type') || 'unknown';
  const body = await res.text().catch(() => '');
  console.log(`[webhook-test.mjs]   ${label} — ${res.status} (${elapsed}ms)`);
  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    console.log(`[webhook-test.mjs]   Content-Type ${contentType}`);
    console.log(`[webhook-test.mjs]   Body         ${body.length > 500 ? body.slice(0, 500) + '...(truncated)' : body}`);
  }
  return { res, body };
}

const commonHeaders = { 'Content-Type': 'application/json' };

const tests = [
  {
    name: '若无签名头 → 403',
    async run() {
      const { res } = await fetchWithLog('无签名', BASE_URL, {
        method: 'POST',
        headers: commonHeaders,
        body: '{}',
      });
      if (res.status !== 403) throw new Error(`期望 403，实际 ${res.status}`);
    },
  },
  {
    name: '签名内容错误 → 403',
    async run() {
      const { res } = await fetchWithLog('签名错误', BASE_URL, {
        method: 'POST',
        headers: { ...commonHeaders, 'X-Signature': 'sha1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
        body: '{}',
      });
      if (res.status !== 403) throw new Error(`期望 403，实际 ${res.status}`);
    },
  },
  {
    name: '若签名正确 → 200',
    async run() {
      const sig = computeSignature(onebotPayload, TOKEN);
      const { res, body } = await fetchWithLog('签名正确', BASE_URL, {
        method: 'POST',
        headers: { ...commonHeaders, 'X-Signature': `sha1=${sig}` },
        body: onebotPayload,
      });
      if (res.status !== 200) {
        throw new Error(`期望 200，实际 ${res.status} — ${body.slice(0, 300)}`);
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
