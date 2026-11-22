---
name: list-then-discover
description: "Build a company list with Trayo search, then run a discovery on it for buying signals. Use when the user can describe the companies they want but cannot name them, and wants to know which are in market."
---

# Build a list with search, then watch it for signals

You can describe the companies you want but not name them, and you want to know what happens at them.

**Cost:** The search is paced `heavy` and is free. Starting a discovery is paced `model`, and reading it is paced `standard`. In an API-only workspace, a discovery charges 3 credits for each company or person with at least one check that finished.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.
- If the workspace and the request do not answer it, ask: What do you sell, and to whom? `trayo_v2_get_workspace` has the answer the workspace saved, in `seller`.
- `trayo_v2_get_discovery` takes `waitSeconds` to wait for new results inside the call. Use it instead of a polling loop.

## Steps

### 1. `trayo_v2_search_companies`

Send `filters` or `similarTo`. Follow `nextCursor` for more pages.

```json
{
  "tool": "trayo_v2_search_companies",
  "arguments": {
    "filters": {
      "industries": [
        "software"
      ],
      "headcount": {
        "min": 200,
        "max": 1000
      },
      "hq": {
        "countries": [
          "US"
        ]
      }
    },
    "limit": 100
  }
}
```

### 2. `trayo_v2_create_list`

Keep at most 200 companies as a `companies` list. Send them as `items`, as they came back, 100 in each call.

```json
{
  "tool": "trayo_v2_create_list",
  "arguments": {
    "name": "US software to watch",
    "type": "companies",
    "items": [
      {
        "id": "co_4kQ9mVt2LpR8sWzB4nAeXy",
        "name": "Stripe",
        "domain": "stripe.com"
      }
    ]
  }
}
```

### 3. `trayo_v2_start_discovery`

Send `companies: { "listId": "<id>" }`, the `signals` to look for and `seller`. If the call fails, send the same call again within 5 minutes: Trayo answers with the discovery the first call started instead of starting another.

```json
{
  "tool": "trayo_v2_start_discovery",
  "arguments": {
    "companies": {
      "listId": "5f0c2a9e-8d1b-4c7a-9e3f-2b6d4a1c8e70"
    },
    "signals": [
      {
        "key": "funding-round",
        "type": "news",
        "detects": "The company raised a new funding round"
      },
      {
        "key": "revops-hiring",
        "type": "jobs",
        "detects": "The company hires for revenue operations"
      }
    ],
    "seller": {
      "name": "Acme",
      "offering": "Revenue operations software for B2B sales teams",
      "target": "B2B software companies with 200 to 2,000 employees"
    }
  }
}
```

### 4. `trayo_v2_get_discovery`

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

Send the companies with events as `employers`, with `titles`, to a people search. Without `titles` or `describe`, that search finds the workspace `stakeholders` and charges for each company.
