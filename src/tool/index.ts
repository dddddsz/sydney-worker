/**
 * Tool — AI 可调用的工具系统
 *
 * TODO: 实现可插拔工具/插件
 * - 定义 Tool 接口 (name, description, handler)
 * - 工具注册与发现
 * - Function calling 到工具的分发
 */
export interface Tool {
  name: string;
  description: string;
  handler: (...args: any[]) => Promise<any>;
}
