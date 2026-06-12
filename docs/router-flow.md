# Router Layer — 路由层

接收 guard 传入的消息，完成**过滤 → 意图识别 → 分发**，将有效消息投递到对应 chat handler。

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
    participant G as guard/index.ts
    participant R as router/index.ts
    participant RF as router/filter.ts
    participant RInt as router/intent.ts
    participant RIcpt as router/intercept.ts
    participant CH as chat/handler.ts

    G->>R: handle(payload, env, ctx, execCtx)
    R->>RF: filterMessage(payload, env, ctx)
    alt 不通过
        RF--xR: null
        R--xG: 200 {}
    else 通过
        RF-->>R: FilteredMessage
    end
    R->>RInt: analyzeIntent(text)
    alt 'tool'
        R--xG: 200 { 工具功能暂未开放 }
    else 'chat' + private
        R->>CH: handlePrivateMessage()
        CH-->>R: Response
        R-->>G: Response
    else 'chat' + group + @bot
        R->>CH: handleGroupMessage(true)
        CH-->>R: Response
        R-->>G: Response
    else 'chat' + group + 关键词
        R->>RIcpt: shouldIntercept(filtered, env)
        RIcpt-->>R: true
        R->>CH: handleGroupMessage(true)
        CH-->>R: Response
        R-->>G: Response
    else 'chat' + group + 忽略
        R->>CH: storeContext() via waitUntil
        R--xG: 200 {}
    end
```

## 退出路径速查

| 触发条件 | 来源文件:行 | HTTP 返回 | 日志标记 |
|---------|------------|----------|---------|
| 消息类型无效 / 空消息 / 群不在白名单 | `filter.ts:69-113` | `200 {}` | `IGNORE` |
| `/` 或 `#` 命令（除 clear/status） | `intent.ts:15` | `200 { reply }` | `intent=tool` |
| 私聊消息通过 | `filter.ts:90-98` | 转 private handler | `type=private` |
| 群聊 @机器人 | `filter.ts:115-125` | 转 group handler | `isAtBot=true` |
| 关键词拦截命中 | `intercept.ts:9` | 转 group handler | — |
| 群聊 + 无 @ + 无关键词 | `index.ts:44` | `200 {}` | `type=group` |
