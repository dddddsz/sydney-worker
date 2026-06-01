# 日志格式规范

## 格式

```
[文件名] [分类] 消息
```

- `[文件名]` — 固定前缀，始终第一个，小写
- `[分类]` — 大写，可选。用于标识消息类型

## 各文件格式对照

| 文件 | 格式示例 |
|---|---|
| `src/index.ts` | `[index.ts] POST http://localhost:8787` |
| `src/message.ts` | `[message.ts][IGNORE] 群 123 不在白名单内` |
| | `[message.ts][GROUP 123] 用户: hello` |
| | `[message.ts][PRIVATE 456] user: hi` |
| | `[message.ts][GROUP ERROR] ...` |
| `src/aiGateway.ts` | 无日志，失败直接 throw Error |
| `tests/test-ai.mjs` | `[test-ai.mjs] [PASS] AI API 连接正常` |
| | `[test-ai.mjs] [FAIL] AI_API_KEY 未设置` |
| | `[test-ai.mjs] [WARN] 返回了内容但并非预期回复` |
| `tests/webhook-test.mjs` | `[webhook-test.mjs] [PASS] 无签名头 → 403` |
| | `[webhook-test.mjs] [FAIL] 签名正确 → 200 — xxx` |

## 分类说明

| 分类 | 含义 | 使用文件 |
|---|---|---|
| `IGNORE` | 消息被过滤/忽略 | message.ts |
| `GROUP` | 群聊相关 | message.ts |
| `PRIVATE` | 私聊相关 | message.ts |
| `ERROR` | 错误 | message.ts, index.ts |
| `PASS` | 测试通过 | test-ai.mjs, webhook-test.mjs |
| `FAIL` | 测试失败 / 致命错误 | test-ai.mjs, webhook-test.mjs |
| `WARN` | 警告（非致命） | test-ai.mjs |

## 规则

1. **`[文件名]`** 始终是第一个字段，用于快速定位来源
2. **`[分类]`** 紧跟在文件名后，可选但建议使用
3. 所有日志均为纯文本，无颜色代码
