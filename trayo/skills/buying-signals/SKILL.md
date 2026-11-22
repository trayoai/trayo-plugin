---
name: buying-signals
description: "Check named companies for buying signals with a Trayo discovery: funding, hiring, LinkedIn posts, technology adoption and new leaders. Use when the user has target accounts and wants to know which show intent or what happened at them recently."
---

# Find buying signals at your companies

You have target companies, and you want to know which of them raised money, hire, post, adopt a technology or hire someone who matters.

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

### 1. `trayo_v2_resolve_companies`

Resolve your companies, and keep the `id` of each `matched` company.

```json
{
  "tool": "trayo_v2_resolve_companies",
  "arguments": {
    "companies": [
      {
        "domain": "datadoghq.com"
      },
      {
        "domain": "snowflake.com"
      }
    ]
  }
}
```

### 2. `trayo_v2_draft_signal` (optional)

Describe a signal in a sentence. `type` is required. A draft writes a `news`, `jobs` or `job_change` definition. Read it, and change it if you like. Define `posts` and `technology` signals directly in the next step.

```json
{
  "tool": "trayo_v2_draft_signal",
  "arguments": {
    "describe": "Companies that hire their first revenue operations lead",
    "type": "jobs",
    "seller": {
      "name": "Acme",
      "offering": "Revenue operations software for B2B sales teams",
      "target": "B2B software companies with 200 to 2,000 employees"
    }
  }
}
```

### 3. `trayo_v2_start_discovery`

Send the companies, and 1 to 10 definitions in `signals`, each with a unique `key`, a `type` and `detects`. Funding is a `news` signal. A `technology` signal names one technology in `technology`: send one signal for each. Use the workspace seller, or send `seller` to override it. If the call fails, send the same call again within 5 minutes: Trayo answers with the discovery the first call started instead of starting another.

```json
{
  "tool": "trayo_v2_start_discovery",
  "arguments": {
    "companies": [
      {
        "id": "co_4kQ9mVt2LpR8sWzB4nAeXy"
      },
      {
        "domain": "snowflake.com"
      }
    ],
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
      },
      {
        "key": "forecast-pain",
        "type": "posts",
        "detects": "A post about problems with sales forecasting or pipeline reporting"
      },
      {
        "key": "dynamics-crm",
        "type": "technology",
        "detects": "Uses Microsoft Dynamics as its CRM",
        "technology": "Microsoft Dynamics"
      },
      {
        "key": "new-sales-leader",
        "type": "job_change",
        "detects": "A new head of sales or of revenue operations"
      }
    ],
    "lookbackDays": 30,
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

Keep each pair of `signalKey` and `eventKey`. Run the same discovery again later, and drop the results whose pair you hold. To run it on a schedule, see the skill `monitor-accounts`.
