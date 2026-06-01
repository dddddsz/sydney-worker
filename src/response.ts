/**
 * 统一构造 JSON 格式的 HTTP 响应
 * @param data   - 响应体对象
 * @param status - HTTP 状态码（默认 200）
 */
export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
