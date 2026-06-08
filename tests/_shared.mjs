/**
 * 测试工具模块
 *
 * 提供测试脚本公用的辅助函数和常量：
 * - root           项目根目录路径
 * - getWranglerVar 读取 wrangler.jsonc 的 vars（process.env → wrangler.jsonc → 默认值）
 * - getEnv         读取环境变量（process.env → .dev.vars → 默认值）
 * - maskKey        掩码 API 密钥（仅显示首尾位）
 * - logResponse    格式化输出 HTTP 响应详情
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const root = resolve(__dirname, '..');

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

function stripJsoncComments(text) {
  let result = '';
  let inString = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inBlockComment) {
      if (ch === '*' && next === '/') { i++; inBlockComment = false; }
      continue;
    }

    if (inString) {
      if (ch === '\\' && next === '"') { result += ch + next; i++; continue; }
      if (ch === '"') inString = false;
      result += ch;
      continue;
    }

    if (ch === '"') { inString = true; result += ch; continue; }
    if (ch === '/' && next === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (ch === '/' && next === '*') { i++; inBlockComment = true; continue; }

    result += ch;
  }

  return result;
}

function loadWranglerJsonc(path) {
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf-8');
    const clean = stripJsoncComments(raw);
    return JSON.parse(clean).vars ?? {};
  } catch {
    return {};
  }
}

const dotenv = loadDotEnv(resolve(root, '.dev.vars'));
const wranglerVars = loadWranglerJsonc(resolve(root, 'wrangler.jsonc'));

export function getWranglerVar(name, fallback = '') {
  return process.env[name] ?? wranglerVars[name] ?? fallback;
}

export function getEnv(name, fallback = '') {
  return process.env[name] ?? dotenv[name] ?? fallback;
}

export function maskKey(key) {
  if (!key || key.length < 12) return key;
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export function logResponse(prefix, details) {
  const { url, status, statusText, elapsed, contentType, body } = details;
  console.log(`${prefix}   URL          ${url}`);
  console.log(`${prefix}   Status       ${status} ${statusText} (${elapsed}ms)`);
  console.log(`${prefix}   Content-Type ${contentType}`);
  console.log(`${prefix}   Body         ${body.length > 500 ? body.slice(0, 500) + '...(truncated)' : body}`);
}
