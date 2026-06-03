/**
 * Session — 会话状态管理
 *
 * TODO: 实现对话历史存储与上下文管理
 * - 按 user_id 或 group_id 维护会话窗口
 * - 支持消息历史裁剪 (sliding window)
 * - 支持持久化 (D1 / KV)
 */
export interface Session {
  id: string;
  messages: { role: string; content: string }[];
  createdAt: number;
  updatedAt: number;
}
