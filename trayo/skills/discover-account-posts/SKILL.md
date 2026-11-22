---
name: discover-account-posts
description: Find LinkedIn posts at named companies that match buying signals, checked by a Trayo discovery. Use when the user wants qualified post-based intent at their accounts rather than a raw post search.
---

# Find posts that match signals at your accounts

You want verified buying signals from LinkedIn posts at companies you name.

**Cost:** Starting a discovery is paced `model`, and reading it is paced `standard`. In an API-only workspace, a discovery charges 3 credits for each company or person with at least one check that finished.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.
- If the workspace and the request do not answer it, ask: What do you sell, and to whom? `trayo_v2_get_workspace` has the answer the workspace saved, in `seller`.
- `trayo_v2_get_discovery` takes `waitSeconds` to wait for new results inside the call. Use it instead of a polling loop.

## Steps

### 1. `trayo_v2_start_discovery`

Send your accounts as `companies` and your definitions as `posts` signals. Trayo retrieves recent posts for each company and checks them against each signal. No post search or post IDs are needed.

```json
{
  "tool": "trayo_v2_start_discovery",
  "arguments": {
    "companies": [
      {
        "domain": "stripe.com"
      }
    ],
    "signals": [
      {
        "key": "forecast-pain",
        "type": "posts",
        "detects": "A post about problems with sales forecasting or pipeline reporting"
      }
    ],
    "seller": {
      "name": "Acme",
      "offering": "Revenue operations software for B2B sales teams",
      "target": "B2B software companies with 200 to 2,000 employees"
    },
    "lookbackDays": 30
  }
}
```

### 2. `trayo_v2_get_discovery`

Results arrive while the discovery runs. Read every page with `limit: 100`, sending `nextCursor` as `cursor`. At the running tail, continue with `resumeCursor` as `cursor` and `waitSeconds: 45`. One read waits for new rows or completion instead of a poll loop. Finish when `status` is `settled`, `canceled` or `failed` and `nextCursor` is `null`. `limit: 0` is a status-only check.

```json
{
  "tool": "trayo_v2_get_discovery",
  "arguments": {
    "id": "<id from an earlier result>",
    "limit": 100
  }
}
```

## Then

Run the same accounts and signals again later. Keep new pairs of `signalKey` and `eventKey`.
