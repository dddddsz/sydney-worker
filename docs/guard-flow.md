# Guard Layer — 请求守卫层

接收 Napcat OneBot webhook，完成**解析 → 鉴权 → 分发**三步，过滤无效请求后转 router。

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
    participant N as Napcat (QQ)
    participant GI as guard/index.ts
    participant GW as guard/webhook.ts
    participant GA as guard/auth.ts
    participant R as router/index.ts

    N->>GI: POST / (OneBot webhook)
    GI->>GW: parseWebhook(request)
    alt method !== 'POST'
        GW--xGI: throw Method Not Allowed
        GI--xN: 405
    else 缺少 X-Signature
        GW--xGI: throw missing signature
        GI--xN: 403
    else 正常
        GW-->>GI: { payload, rawBody, receivedHex }
    end
    GI->>GA: verifySignature(rawBody, TOKEN, receivedHex)
    alt 签名不匹配
        GA--xGI: false
        GI--xN: 403
    else 通过
        GA-->>GI: true
    end
    alt post_type !== 'message'
        GI-->>N: 200 {}
    else 消息事件
        GI->>R: handleRouter(payload, env, ctx, execCtx)
        R-->>GI: Response
        GI-->>N: Response
    end
```

## 退出路径速查

| 触发条件 | 来源文件:行 | HTTP 返回 | 日志标记 |
|---------|------------|----------|---------|
| 非 POST 方法 | `webhook.ts:12` | `405 Method Not Allowed` | `method=not-allowed` |
| 缺少 `X-Signature` | `webhook.ts:17` | `403 missing signature` | `signature=missing` |
| 签名不匹配 | `auth.ts:29` | `403 signature mismatch` | `signature=mismatch` |
| 非消息事件 | `index.ts:27` | `200 {}` | `post_type=xxx` |
| 异常兜底 | `index.ts:35` | `200 {}` | `error="xxx"` |
| ✅ 正常通过 | `index.ts:32` | 由 router 决定 | `status=200` |
