# Sydney Worker

基于 Cloudflare Workers 的 QQ 机器人，通过 OneBot Webhook 接收消息，调用 LLM API 进行 AI 对话。

## 使用方式

### 环境变量

| 变量 | 说明 | 必需 |
|---|---|---|
| `TOKEN` | Webhook HMAC 签名密钥(一般是napcat的) | ✅ |
| `AI_BASE_URL` | LLM API 地址 | ✅ |
| `AI_API_KEY` | LLM API 密钥 | ✅ |
| `AI_MODEL` | 模型名 | ✅ |
| `AI_FALLBACK_BASE_URL` | 次选 LLM 地址 | ❌ |
| `AI_FALLBACK_API_KEY` | 次选 LLM 密钥 | ❌ |
| `AI_FALLBACK_MODEL` | 次选 LLM 模型 | ❌ |
| `BOT_QQ` | 机器人自己的 QQ 号（用于识别群消息中是否 @ 机器人） | ✅ |
| `ALLOWED_GROUP_ID` | 允许接收消息的 QQ 群号 | ✅ |

### 快速开始

```bash

# node版本 v24.16.0
# 看情况决定自己的版本吧

# 1. 安装依赖
pnpm install

# 2. 配置环境变量（编辑 .dev.vars）

# 3. 本地开发
npx wrangler dev

# 4. 部署
npx wrangler deploy
```

## 模块

| 模块 | 路径 | 状态 | 文档 | 说明 |
|---|---|---|---|
| guard | src/guard/ | ✅ | `docs/guard-flow.md` | Webhook 请求签名校验 |
| router | src/router/ | ✅ | `docs/router-flow.md` | 消息过滤、意图识别与分发 |
| chat | src/chat/ | ✅ | `docs/chat-flow.md` | 私聊与群聊消息处理 |
| ai | src/ai/ | ✅ | `docs/ai-flow.md` | LLM API 调用（首选失败自动切换次选） |
| turn | src/turn/ | ✅ | — | 交互记录归档 |
| session | src/session/ | ✅ 初步实现 | — | 对话历史会话管理 |
| tool | src/tool/ | ⏳ 未实现 | — | AI 可调用的工具/插件系统 |

## 测试

| 脚本 | 用途 |
|---|---|
| tests/ai-test.mjs | AI API 联通性测试 |
| tests/list-models.mjs | 列出 API 可用模型 |
| tests/webhook-test.mjs | Webhook 端到端集成测试（需设置qq号） |

运行：`node tests/<脚本名>.mjs`

## 日志

格式详见 `LOG_FORMAT.md`。统一格式：`[req:{id}] [{source}][{event}] key=value key=value 描述`

## 项目结构

```
src/
├── index.ts       # Worker 入口
├── ctx.ts         # 日志上下文
├── response.ts    # JSON 响应助手
├── ai/            # AI 调用层
├── chat/          # 消息处理层
├── guard/         # 请求守卫层
├── router/        # 消息路由层
├── session/       # 会话管理
├── tool/          # 工具系统（未实现）
└── turn/          # 交互归档

tests/
├── ai-test.mjs
├── list-models.mjs
└── webhook-test.mjs
```
