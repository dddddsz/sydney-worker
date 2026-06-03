import { LogContext, logLine } from '../ctx';

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
