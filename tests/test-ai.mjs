/**
 * AI API 联通性测试脚本
 *
 * 使用方法：
 *   npm run test-ai              # 运行测试
 *   node tests/test-ai.mjs       # 直接运行
 *
 * 前置条件：
 *   1. 在项目根目录创建 .dev.vars 文件，写入 AI_API_KEY=your_key
 *      或通过环境变量 AI_API_KEY 传入
 *   2. 可选配置 AI_BASE_URL、AI_MODEL（有默认值）
 *
 * 执行流程：
 *   加载配置 → 发送 chat completions 请求 → 验证回复 → 输出结果
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// 从 .dev.vars 文件加载环境变量（KEY=VAL 格式，支持 # 注释）
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

// 按优先级读取配置：环境变量 > .dev.vars > 默认值
function getEnv(name, fallback = '') {
  return process.env[name] ?? dotenv[name] ?? fallback;
}

const AI_BASE_URL = getEnv('AI_BASE_URL', 'https://api.anyapi.ai/v1');
const AI_API_KEY = getEnv('AI_API_KEY');
const AI_MODEL   = getEnv('AI_MODEL', 'google/gemma-4-26b-a4b-it:free');

// 终端彩色日志输出（红/绿/黄/青 + 重置）
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';

function log(color, label, msg) {
  console.log(`${color}[${label}]${RESET} ${msg}`);
}

// 前置检查：API Key 必须存在
if (!AI_API_KEY) {
  log(RED, 'FAIL', 'AI_API_KEY 未设置。请在 .dev.vars 或环境变量中配置。');
  process.exit(1);
}

// 构造 chat completions 请求
const url = `${AI_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
const body = {
  model: AI_MODEL,
  messages: [
    { role: 'user', content: '你好，请回复"连接正常"这四个字，不要回复其他内容。' },
  ],
  max_tokens: 64,
};

// 打印请求参数摘要（密钥脱敏显示首尾各 4 位）
console.log(`\n${CYAN}══════════════ AI API 联通测试 ══════════════${RESET}\n`);
console.log(`  ${YELLOW}URL${RESET}    ${AI_BASE_URL}`);
console.log(`  ${YELLOW}Model${RESET}  ${AI_MODEL}`);
console.log(`  ${YELLOW}Key${RESET}    ${AI_API_KEY.slice(0, 8)}...${AI_API_KEY.slice(-4)}\n`);

const start = Date.now();

try {
  // 发送请求到 AI API
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const elapsed = Date.now() - start;
  const text = await response.text();

  console.log(`  ${YELLOW}HTTP${RESET}   ${response.status} ${response.statusText}`);
  console.log(`  ${YELLOW}耗时${RESET}  ${elapsed}ms\n`);

  // API 返回非 2xx 时直接判定失败
  if (!response.ok) {
    log(RED, 'FAIL', `API 返回错误: ${response.status}\n${text}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    log(RED, 'FAIL', `响应不是有效 JSON:\n${text}`);
    process.exit(1);
  }

  // 提取 AI 回复文本
  const reply = data.choices?.[0]?.message?.content ?? '(空)';

  console.log(`  ${CYAN}回复${RESET}   ${reply}\n`);

  // 验证 AI 回复是否包含预期关键词"连接正常"
  if (reply.includes('连接正常')) {
    log(GREEN, 'PASS', 'AI API 连接正常 ✓\n');
    process.exit(0);
  } else {
    log(YELLOW, 'WARN', `返回了内容但并非预期回复: "${reply}"`);
    log(GREEN, 'PASS', 'AI API 本身已连通 ✓\n');
    process.exit(0);
  }

} catch (err) {
  const elapsed = Date.now() - start;
  console.log(`  ${YELLOW}耗时${RESET}  ${elapsed}ms\n`);
  log(RED, 'FAIL', `请求失败: ${err.message}\n`);
  process.exit(1);
}
