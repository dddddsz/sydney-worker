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

const dotenv = loadDotEnv(resolve(root, '.dev.vars'));

export function getEnv(name, fallback = '') {
  return process.env[name] ?? dotenv[name] ?? fallback;
}

export function maskKey(key) {
  if (!key || key.length < 12) return key;
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export function buildApiUrl(baseUrl, endpoint) {
  const base = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}/v1${path}`;
}

export function logResponse(prefix, details) {
  const { url, status, statusText, elapsed, contentType, body } = details;
  console.log(`${prefix}   URL          ${url}`);
  console.log(`${prefix}   Status       ${status} ${statusText} (${elapsed}ms)`);
  console.log(`${prefix}   Content-Type ${contentType}`);
  console.log(`${prefix}   Body         ${body.length > 500 ? body.slice(0, 500) + '...(truncated)' : body}`);
}
