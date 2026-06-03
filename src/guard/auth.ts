import { LogContext, logLine } from '../ctx';

/**
 * HMAC-SHA1 签名验证
 * 用 token 对请求体签名，与 X-Signature 头比较
 * @param bodyBytes   - 原始请求体字节
 * @param token       - 签名密钥
 * @param receivedHex - 请求头中的十六进制签名
 * @param ctx         - 日志上下文
 * @returns 签名是否匹配
 */
export async function verifySignature(
  bodyBytes: Uint8Array,
  token: string,
  receivedHex: string,
  ctx: LogContext,
): Promise<boolean> {
  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', secretKey, bodyBytes);
  const expectedHex = [...new Uint8Array(sigBuf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const result = receivedHex === expectedHex;
  logLine(ctx, 'guard/auth', `signature=${result ? 'valid' : 'invalid'}`, result ? 'OK' : 'FAIL');
  return result;
}
