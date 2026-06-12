# AI Layer — AI 调用层

接收 chat handler 传入的完整 messages 数组，完成**双 provider 重试 → LLM API 调用 → 响应解析**，返回回复。

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'fontSize': '20px',
  'actorFontSize': '20px',
  'messageFontSize': '20px',
  'lineColor': '#5a8dc8',
  'primaryTextColor': '#e66e18',
  'textColor': '#4bf837'
}}}%%
sequenceDiagram
    participant CH as chat/handler.ts
    participant AI as ai/index.ts
    participant AP as ai/provider.ts
    participant LLM as LLM API

    CH->>AI: callAI(messages, env, ctx)
    AI->>AI: 记录 reqStart, 读取 AI_TIMEOUT
    AI->>AP: callProvider(messages, ...)

    alt 主 API 成功
        AP->>LLM: POST {AI_BASE_URL}/chat/completions
        LLM-->>AP: 200 { choices[0].message.content }
        AP-->>AI: reply
        AI-->>CH: reply
    else 主 API 出错
        AP--xAI: throw
        AI->>AI: logLine(FALLBACK)
        AI->>AP: callProvider(messages, ... 次选)
        alt fallback 成功
            AP->>LLM: POST {AI_FALLBACK_BASE_URL}/chat/completions
            LLM-->>AP: 200 { choices[0].message.content }
            AP-->>AI: reply
            AI-->>CH: reply
        else fallback 失败
            AP--xAI: throw
            AI->>AI: logLine(RETRY_FAIL)
            AI--xCH: throw
        end
    end
```

## 退出路径速查

| 触发条件 | 来源文件:行 | 返回方式 | 日志标记 |
|---------|------------|---------|---------|
| 主 API 超时 | `provider.ts:43-45` | 转 fallback | `TIMEOUT` |
| 主 API HTTP 错误 | `provider.ts:50-53` | 转 fallback | `ERROR` |
| 主 API 成功 | `provider.ts:56-59` | `200 { reply }` | `RESP` |
| fallback API 超时 | `provider.ts:43-45` | throw → handler 兜底 | `TIMEOUT` |
| fallback API HTTP 错误 | `provider.ts:50-53` | throw → handler 兜底 | `ERROR` |
| fallback API 成功 | `provider.ts:56-59` | `200 { reply }` | `RESP` |
| 全部失败 | `index.ts:30-46` | throw → handler 兜底 | `RETRY_FAIL` |
