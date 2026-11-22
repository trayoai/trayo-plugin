---
name: monitor-accounts
description: Watch the same companies for new buying signals on a schedule with Trayo, and act only on events not seen before. Use when the user wants recurring account monitoring, a daily or weekly check, or an app or job that acts on new events.
---

# Watch your companies for new signals on a schedule

An app or a scheduled job checks the same companies every day or week, and acts only on the events it has not seen.

**Cost:** Starting a discovery is paced `model`, and reading it is paced `standard`. In an API-only workspace, a discovery charges 3 credits for each company or person with at least one check that finished.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.
- If the workspace and the request do not answer it, ask: How often do you want the check to run? Daily or weekly fits most teams.
- `trayo_v2_get_discovery` takes `waitSeconds` to wait for new results inside the call. Use it instead of a polling loop.

## Steps

### 1. `trayo_v2_resolve_companies`

Once, when you set up the job: resolve the companies and store each `id` with its `domain` or `linkedinUrl`. Store your signal definitions and `seller` too. If a stored `id` comes back in `unresolved`, resolve that company again by its `domain`.

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

### 2. `trayo_v2_start_discovery`

On a scheduled run that holds no running discovery: start one with `waitSeconds: 0`, and store its `id`. Set `lookbackDays` to at least the time between two discovery starts, such as `14` for one start each week. The same call sent again within 5 minutes answers that discovery instead of starting another.

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
        "key": "new-sales-leader",
        "type": "job_change",
        "detects": "A new head of sales or of revenue operations"
      }
    ],
    "lookbackDays": 14,
    "seller": {
      "name": "Acme",
      "offering": "Revenue operations software for B2B sales teams",
      "target": "B2B software companies with 200 to 2,000 employees"
    },
    "waitSeconds": 0
  }
}
```

### 3. `trayo_v2_get_discovery`

On each later run, use the stored cursor. Store `resumeCursor` before waiting for the next run. Results arrive while the discovery runs. Read every page with `limit: 100`, sending `nextCursor` as `cursor`. At the running tail, continue with `resumeCursor` as `cursor` and `waitSeconds: 45`. One read waits for new rows or completion instead of a poll loop. Finish when `status` is `settled`, `canceled` or `failed` and `nextCursor` is `null`. `limit: 0` is a status-only check.

```json
{
  "tool": "trayo_v2_get_discovery",
  "arguments": {
    "id": "<id from an earlier result>",
    "limit": 100
  }
}
```

### 4. `trayo_v2_list_discoveries` (optional)

If you lost the `id`, find the discovery here, newest first. A start sent more than 5 minutes later starts, and charges for, a new discovery.

```json
{
  "tool": "trayo_v2_list_discoveries",
  "arguments": {
    "limit": 25
  }
}
```

## Then

Keep each pair of `signalKey` and `eventKey`, and act only on the results whose pair is new. Then clear the stored `id`, so the next period starts a new discovery. A workspace runs 10 discoveries at once by default. For more than 200 companies, start one discovery for each 200, and start the rest on later runs. If a start is refused with `rate_limited`, send it on the next run.
