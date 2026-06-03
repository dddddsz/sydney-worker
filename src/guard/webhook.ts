/**
 * OneBot Webhook 请求解析
 * 校验请求方法、提取 X-Signature、解析 JSON 体
 */
const EXP_PREFIX = 'sha1=';

export async function parseWebhook(request: Request): Promise<{
  payload: any;
  rawBody: Uint8Array;
  receivedHex: string;
}> {
  if (request.method !== 'POST') {
    throw new Error('Method Not Allowed');
  }

  const sigHeader = request.headers.get('X-Signature') ?? '';
  if (!sigHeader.startsWith(EXP_PREFIX)) {
    throw new Error('missing signature');
  }
  const receivedHex = sigHeader.slice(EXP_PREFIX.length);

  const rawBuf = await request.arrayBuffer();
  const rawBody = new Uint8Array(rawBuf);

  const payload = JSON.parse(new TextDecoder().decode(rawBody));

  return { payload, rawBody, receivedHex };
}
