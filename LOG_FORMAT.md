# 日志格式规范

## 格式

```
[req:{id}] [{source}][{event}] key=value key=value 描述
```

- `[req:{id}]` — 请求唯一标识（8位随机 hex），用于串联一次请求的全生命周期
- `[{source}]` — 来源模块，小写，如 `guard`、`guard/auth`、`router`、`router/filter`、`chat/private`、`chat/group`、`chat/ai`
- `[{event}]` — 事件类型，大写，可选，用于标识生命周期节点或状态

## 各模块格式对照

| 模块 | 格式示例 |
|---|---|
| `guard` | `[req:a1b2c3] [guard][START]  method=POST` |
| | `[req:a1b2c3] [guard][END]    status=200 duration=915ms` |
| | `[req:a1b2c3] [guard][ERROR]  error="timeout" duration=123ms` |
| `guard/auth` | `[req:a1b2c3] [guard/auth][OK]   signature=valid` |
| | `[req:a1b2c3] [guard/auth][FAIL] signature=invalid` |
| `router` | `[req:a1b2c3] [router] type=private userId=123 intent=chat text="你好"` |
| `router/filter` | `[req:a1b2c3] [router/filter][IGNORE] 空消息，跳过` |
| `chat/private` | `[req:a1b2c3] [chat/private][START] text="你好"` |
| | `[req:a1b2c3] [chat/private][END]   duration=902ms reply="你好呀 😊"` |
| | `[req:a1b2c3] [chat/private][ERROR] duration=5000ms err="timeout"` |
| `chat/group` | `[req:a1b2c3] [chat/group][START] groupId=811759124 text="你好"` |
| | `[req:a1b2c3] [chat/group][END]   duration=902ms reply="你好呀 😊"` |
| | `[req:a1b2c3] [chat/group][ERROR] duration=5000ms err="timeout"` |
| `chat/ai` | `[req:a1b2c3] [chat/ai][REQ]  model=google/gemma-4` |
| | `[req:a1b2c3] [chat/ai][BODY] {"model":"google/gemma-4",...}` |
| | `[req:a1b2c3] [chat/ai][RESP] status=200 duration=890ms` |
| | `[req:a1b2c3] [chat/ai][ERROR] status=502 duration=1200ms body="..."` |

## 事件分类说明

| 分类 | 含义 | 使用模块 |
|---|---|---|
| `START` | 阶段开始（含上下文） | guard, chat/private, chat/group |
| `END` | 阶段正常结束（含耗时/结果） | guard, chat/private, chat/group |
| `ERROR` | 阶段异常结束（含耗时/错误信息） | guard, chat/private, chat/group, chat/ai |
| `OK` | 内部检查通过 | guard/auth |
| `FAIL` | 内部检查未通过 | guard/auth |
| `IGNORE` | 消息被过滤/忽略 | router/filter |
| `REQ` | 外部 API 请求发出 | chat/ai |
| `BODY` | 请求完整 JSON 体 | chat/ai |
| `RESP` | 外部 API 成功响应 | chat/ai |

## 规则

1. `[req:{id}]` 始终是第一个字段，一次请求内相同
2. `[{source}]` 固定第二个字段
3. `[{event}]` 紧跟在 source 后，可选
4. 所有日志均为纯文本，无颜色代码
5. 模块间传递 ctx（LogContext）以保持 requestId 一致
