# Chat Layer — 对话层

接收 router 分发的消息，完成**命令处理 → 会话管理 → AI 调用 → mood 更新**，返回回复。

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
    participant R as router/index.ts
    participant CP as chat/private.ts
    participant CG as chat/group.ts
    participant CH as chat/handler.ts
    participant SS as session/store.ts
    participant AI as ai/index.ts
    participant LLM as LLM API
    participant PP as chat/prompt.ts
    participant MOOD as chat/mood.ts

    alt private
        R->>CP: handlePrivateMessage()
        CP->>CH: handleChat(type='private')
    else group
        R->>CG: handleGroupMessage(atSender)
        CG->>CH: handleChat(type='group', groupId)
    end

    CH->>SS: buildId(type, userId, groupId)

    alt /clear
        CH->>SS: delete(sessionId)
        SS-->>CH: void
        CH-->>R: jsonResponse({ reply: '对话记忆已清除' })
    else /status
        CH->>SS: get(sessionId)
        SS-->>CH: session | null
        CH-->>R: jsonResponse({ reply: '会话状态...' })
    else 正常对话
        CH->>SS: get(sessionId)
        SS-->>CH: { mood, ... }
        CH->>MOOD: getMoodRange(mood.value)
        MOOD-->>CH: MoodRange
        CH->>SS: getContext(sessionId)
        SS-->>CH: history[]
        CH->>PP: buildSystemPrompt(mood)
        PP-->>CH: system prompt

        CH->>AI: callAI([system, ...history, user], env, ctx)
        alt 主 API 成功
            AI->>LLM: POST /chat/completions
            LLM-->>AI: { choices[0].message.content }
            AI-->>CH: reply
        else 主 API 失败
            AI--xCH: 异常
            AI->>LLM: POST /chat/completions (fallback)
            LLM-->>AI: { choices[0].message.content }
            AI-->>CH: reply
        else 全部失败
            AI--xCH: throw
            CH-->>R: jsonResponse({ reply: 'AI 暂时繁忙' })
        end

        CH->>SS: append(user message)
        alt reply 非空
            CH->>SS: append(assistant reply)
        end
        CH->>MOOD: computeNextMood(moodValue, reply)
        MOOD-->>CH: newMood
        CH->>SS: updateMood(newMood)
        SS-->>CH: void

        CH-->>R: jsonResponse({ reply, at_sender? })
    end
```

## 退出路径速查

| 触发条件 | 来源文件:行 | HTTP 返回 | 日志标记 |
|---------|------------|----------|---------|
| 私聊消息 | `private.ts:10` | 转 handler | `type=private` |
| 群聊 @机器人 | `group.ts:11` | 转 handler | `type=group` |
| 命令 `/clear` | `handler.ts:45` | `200 { reply }` | `CMD` |
| 命令 `/status` | `handler.ts:51` | `200 { reply }` | `CMD` |
| 主 API 成功 | `handler.ts:73` | `200 { reply }` | `END` |
| 主 API 失败 → fallback 成功 | `ai/index.ts:88-92` | `200 { reply }` | `FALLBACK` |
| 主 + fallback 均失败 | `ai/index.ts:102-104` | `200 { reply }` | `RETRY_FAIL` |
| 异常兜底 | `handler.ts:98` | `200 { reply: AI 暂时繁忙 }` | `ERROR` |
