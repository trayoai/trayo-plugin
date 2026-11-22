---
name: track-champions
description: "Find out when champions, past buyers or users move to a new company with a Trayo people discovery. Use when the user wants job-change alerts for people they know."
---

# Find out when your champions move to a new company

You know people who bought from you or used your product, and you want to know when one of them starts at another company.

**Cost:** Resolve by LinkedIn page is paced `standard`, and resolve by name `heavy`. The `within` search is free and paced `standard`. Starting a discovery is paced `model`, and reading it is paced `standard`. In an API-only workspace, a discovery charges 3 credits for each company or person with at least one check that finished.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.
- If the workspace and the request do not answer it, ask: What do you sell, and to whom? `trayo_v2_get_workspace` has the answer the workspace saved, in `seller`.
- `trayo_v2_get_discovery` takes `waitSeconds` to wait for new results inside the call. Use it instead of a polling loop.

## Steps

### 1. `trayo_v2_resolve_people`

Resolve your champions. Store each person `id` with the `company.id` of their employer now.

```json
{
  "tool": "trayo_v2_resolve_people",
  "arguments": {
    "people": [
      {
        "linkedinUrl": "https://www.linkedin.com/in/jane-doe"
      },
      {
        "name": "Sam Lee",
        "company": {
          "domain": "stripe.com"
        }
      }
    ]
  }
}
```

### 2. `trayo_v2_create_list` (optional)

Keep them as a `people` list of at most 200, or send them inline.

```json
{
  "tool": "trayo_v2_create_list",
  "arguments": {
    "name": "Champions",
    "type": "people",
    "items": [
      {
        "id": "jane-doe"
      }
    ]
  }
}
```

### 3. `trayo_v2_start_discovery`

Send them as `people` with a `job_change` signal and no `direction`. `lookbackDays: 90` finds the moves of the last three months.

```json
{
  "tool": "trayo_v2_start_discovery",
  "arguments": {
    "people": {
      "listId": "5f0c2a9e-8d1b-4c7a-9e3f-2b6d4a1c8e70"
    },
    "signals": [
      {
        "key": "champion-moved",
        "type": "job_change",
        "detects": "The person started a new role at another company"
      }
    ],
    "lookbackDays": 90,
    "seller": {
      "name": "Acme",
      "offering": "Revenue operations software for B2B sales teams",
      "target": "B2B software companies with 200 to 2,000 employees"
    }
  }
}
```

### 4. `trayo_v2_get_discovery`

Results arrive while the discovery runs. Read every page with `limit: 100`, sending `nextCursor` as `cursor`. At the running tail, continue with `resumeCursor` as `cursor` and `waitSeconds: 45`. One read waits for new rows or completion instead of a poll loop. Finish when `status` is `settled`, `canceled` or `failed` and `nextCursor` is `null`. `limit: 0` is a status-only check. In each result, `person` is your champion and `person.previousCompany` the company before the move. `company` is the company they joined. It is `null` when unknown, and its `id` is `null` when Trayo holds no such company.

```json
{
  "tool": "trayo_v2_get_discovery",
  "arguments": {
    "id": "<id from an earlier result>",
    "limit": 100
  }
}
```

### 5. `trayo_v2_search_people` (optional)

A free check now, without a discovery: send the people as `within` with `currentRole.startedAfter`. Compare each `company.id` with the one you stored, because a promotion matches too. A page can hold fewer people, even none, while `nextCursor` continues.

```json
{
  "tool": "trayo_v2_search_people",
  "arguments": {
    "within": {
      "listId": "5f0c2a9e-8d1b-4c7a-9e3f-2b6d4a1c8e70"
    },
    "currentRole": {
      "startedAfter": "2026-07"
    },
    "limit": 100
  }
}
```

## Then

Run the discovery again on a schedule, as in the skill `monitor-accounts`. Drop the pairs of `signalKey` and `eventKey` you hold. To reach a champion at the new company, look up their email with `trayo_v2_lookup_contacts`.
