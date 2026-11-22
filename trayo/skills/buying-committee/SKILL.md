---
name: buying-committee
description: "Map the buying committee at a few companies with Trayo when the user can describe the people in a sentence but not as exact titles. Use for stakeholder mapping: who owns, buys or influences the purchase."
---

# Map the buying committee at a few companies

You can describe the people you want in a sentence, but not as exact titles.

**Cost:** The `describe` search is paced `model` and charges 10 credits for each company searched. The key needs `research:run`. The repeat with `titles` and `qualify` is paced `model` and is free.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_search_people`

Send at most 50 `employers`, `describe` (who you want, in plain language) and, for labels, `personas`. Employers × `perCompany` must not exceed 25. Split larger sets into smaller requests. The answer is one page, with `perCompany` people per company (default 5). Each person has `match.persona` and `match.reason`.

```json
{
  "tool": "trayo_v2_search_people",
  "arguments": {
    "employers": [
      {
        "domain": "snowflake.com"
      }
    ],
    "describe": "Leaders who own the data infrastructure budget",
    "personas": [
      "Head of Data",
      "CTO"
    ],
    "perCompany": 5
  }
}
```

### 2. `trayo_v2_search_people` (optional)

To run about the same search again free, and at more companies, send `derived.titles` as `titles`. `qualify` needs every criterion to hold. So send one criterion that names every persona, not `derived.criteria` as it is. The repeat is approximate: `describe` ran one title search per persona, `titles` runs one over all of them.

```json
{
  "tool": "trayo_v2_search_people",
  "arguments": {
    "employers": {
      "listId": "5f0c2a9e-8d1b-4c7a-9e3f-2b6d4a1c8e70"
    },
    "titles": {
      "any": [
        "head of data",
        "vp data",
        "chief data officer"
      ]
    },
    "qualify": {
      "criteria": [
        "Leads the data infrastructure as Head of Data, CTO or a similar role"
      ]
    },
    "limit": 25
  }
}
```
