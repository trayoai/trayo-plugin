---
name: similar-companies
description: "Find lookalike companies similar to the user's best customers with Trayo. Use when the user names customers or example companies and wants more like them."
---

# Find companies similar to your best customers

You can name your best customers, and you want more companies like them.

**Cost:** Resolve by name and the similarity ranking are paced `heavy`. Free.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_resolve_companies`

Resolve your customers by name or domain. For an `ambiguous` name, pick one of the `candidates`, as in the skill `names-to-ids`.

```json
{
  "tool": "trayo_v2_resolve_companies",
  "arguments": {
    "companies": [
      {
        "name": "Ramp",
        "country": "US"
      },
      {
        "domain": "brex.com"
      },
      {
        "domain": "mercury.com"
      }
    ]
  }
}
```

### 2. `trayo_v2_search_companies`

Send the matched companies as `similarTo.seeds`, 1 to 50. `sameSize` is `true` by default. With 3 or more seeds of known size, it keeps companies inside their employee range. Send `sameSize: false` for any size. A `seed_not_indexed` note names seeds with no similarity data.

```json
{
  "tool": "trayo_v2_search_companies",
  "arguments": {
    "similarTo": {
      "seeds": [
        {
          "id": "co_4kQ9mVt2LpR8sWzB4nAeXy"
        },
        {
          "domain": "brex.com"
        },
        {
          "domain": "mercury.com"
        }
      ],
      "sameSize": true
    },
    "filters": {
      "hq": {
        "countries": [
          "US"
        ]
      }
    },
    "limit": 50
  }
}
```

### 3. `trayo_v2_create_list` (optional)

Keep the companies you want as a `companies` list.

```json
{
  "tool": "trayo_v2_create_list",
  "arguments": {
    "name": "Like our best customers",
    "type": "companies",
    "items": [
      {
        "id": "co_4kQ9mVt2LpR8sWzB4nAeXy",
        "name": "Brex",
        "domain": "brex.com"
      }
    ]
  }
}
```

## Then

Watch the list for buying signals, as in the skill `list-then-discover`.
