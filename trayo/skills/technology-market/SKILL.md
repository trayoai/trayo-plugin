---
name: technology-market
description: Find companies across the market that use a technology, such as a competitor's product or a tool the user replaces, with a Trayo market discovery. Use for competitor takeouts or technology-based prospecting beyond named accounts.
---

# Find new accounts that use a technology

You want the companies that use a competitor's product or a tool you replace, across the market, not only the companies you name.

**Cost:** The preview is paced `heavy` and is free. Starting a discovery is paced `model`, and reading it is paced `standard`. In an API-only workspace, a discovery charges 3 credits for each company or person with at least one check that finished. Finding the companies is free.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.
- If the workspace and the request do not answer it, ask: What do you sell, and to whom? `trayo_v2_get_workspace` has the answer the workspace saved, in `seller`.
- `trayo_v2_get_discovery` takes `waitSeconds` to wait for new results inside the call. Use it instead of a polling loop.

## Steps

### 1. `trayo_v2_preview_discovery`

Send `market` and one `technology` signal, with the vendor's website in `vendorDomains`. Read `marketCompanies`, `profileCompanies`, `companies` and `top`. Tune `market.filters`, `market.dropIndustries` and `market.limit` until the count fits. If the name is a common word, add `contextWords` that a real mention sits beside, or `excludeWords` for the noise.

```json
{
  "tool": "trayo_v2_preview_discovery",
  "arguments": {
    "market": {
      "limit": 500,
      "filters": {
        "headcount": {
          "min": 1000
        }
      }
    },
    "signals": [
      {
        "key": "uses-competitor",
        "type": "technology",
        "detects": "The company uses Microsoft Dynamics as its CRM",
        "technology": "Microsoft Dynamics",
        "vendorDomains": [
          "microsoft.com"
        ]
      }
    ],
    "lookbackDays": 180
  }
}
```

### 2. `trayo_v2_start_discovery`

Send the same arguments. Trayo checks each company it found. Use the workspace seller, or send `seller` to override it. If the call fails, send the same call again within 5 minutes: Trayo answers with the discovery the first call started instead of starting another.

```json
{
  "tool": "trayo_v2_start_discovery",
  "arguments": {
    "market": {
      "limit": 500,
      "filters": {
        "headcount": {
          "min": 1000
        }
      }
    },
    "signals": [
      {
        "key": "uses-competitor",
        "type": "technology",
        "detects": "The company uses Microsoft Dynamics as its CRM",
        "technology": "Microsoft Dynamics",
        "vendorDomains": [
          "microsoft.com"
        ]
      }
    ],
    "lookbackDays": 180,
    "seller": {
      "name": "Acme",
      "offering": "Revenue operations software for B2B sales teams",
      "target": "B2B software companies with 200 to 2,000 employees"
    }
  }
}
```

### 3. `trayo_v2_get_discovery`

Results arrive while the discovery runs. Read every page with `limit: 100`, sending `nextCursor` as `cursor`. At the running tail, continue with `resumeCursor` as `cursor` and `waitSeconds: 45`. One read waits for new rows or completion instead of a poll loop. Finish when `status` is `settled`, `canceled` or `failed` and `nextCursor` is `null`. `limit: 0` is a status-only check. Each result has `role` and `confidence`. Evidence comes from job postings, posts and the profiles of people who work there. A profile result names the person in `person`.

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

Run the 180-day discovery once. To catch new accounts after it, run the same arguments with `lookbackDays: 3` each day. Send the companies you hold in `market.excludeCompanies`, and drop the pairs of `signalKey` and `eventKey` you hold.
