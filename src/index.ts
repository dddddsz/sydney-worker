import { handleMessage } from './message';
import { jsonResponse } from './response';

/**
 * QQ 机器人 Worker —— 接收 OneBot 协议 Webhook，验签后分发消息
 *
 * 处理流程：
 *   1. 仅接受 POST 请求
 *   2. 校验请求头 X-Signature（HMAC-SHA1）
 *   3. 解析 JSON body
 *   4. 按 post_type 分发给对应处理函数
 */
export default {
	async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
		console.log('[index.ts]', request.method, request.url);

		// 仅接受 POST 请求
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		// 1. 从请求头中提取签名（格式：sha1=xxxxxxxx...）
		const sigHeader = request.headers.get('X-Signature') ?? '';
		const EXP_PREFIX = 'sha1=';
		if (!sigHeader.startsWith(EXP_PREFIX)) {
			return new Response('missing signature', { status: 403 });
		}
		const receivedHex = sigHeader.slice(EXP_PREFIX.length);

		// 2. 用 TOKEN 对原始请求体计算 HMAC-SHA1
		const rawBuf = await request.arrayBuffer();
		const bodyBytes = new Uint8Array(rawBuf);

		const secretKey = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(env.TOKEN),
			{ name: 'HMAC', hash: 'SHA-1' },
			false,
			['sign'],
		);
		const sigBuf = await crypto.subtle.sign('HMAC', secretKey, bodyBytes);
		const expectedHex = [...new Uint8Array(sigBuf)]
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		// 3. 比对签名，不一致则拒绝
		if (receivedHex !== expectedHex) {
			return new Response('signature mismatch', { status: 403 });
		}

		// 签名校验通过，解析并分发消息
		try {
			const payload = JSON.parse(new TextDecoder().decode(bodyBytes));

			// 仅处理消息事件，其他事件静默忽略
			if ((payload as any).post_type === 'message') {
				return await handleMessage(payload, env);
			}

			return jsonResponse({});
		} catch (e) {
			console.error('[index.ts] Fetch Error:', e);
			return jsonResponse({});
		}
	},
};
