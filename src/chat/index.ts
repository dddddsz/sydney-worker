/**
 * Chat 模块入口
 * 统一导出私聊和群聊处理器及系统提示词
 */
export { handlePrivateMessage } from './private';
export { handleGroupMessage } from './group';
export { buildSystemPrompt } from './prompt';
