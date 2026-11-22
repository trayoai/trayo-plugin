---
name: icp-account-list
description: Build a target account list from an ideal customer profile (industry, size, location) with Trayo search, then add similar companies. Use when the user describes the companies they sell to and wants a list to work from.
---

# Build a company list from an ICP, then add similar companies

You know the industry, size and location of the companies you sell to, and you want a list to work from.

**Cost:** Paced `heavy`. Free. List changes need `lists:write`.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_search_companies`

Send `filters.industries`, `filters.headcount` and `filters.hq`. Follow `nextCursor` for more pages. A `led_by_headcount` note means only the largest companies were checked: add `industries`, `headcount` or `hq.cities`. A `search_depth_reached` note means more companies match than one search reads: narrow `filters`.

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

Create a `companies` list, and send the results you keep as `items`, as they came back. A call adds at most 100.

```json
{
  "tool": "trayo_v2_create_list",
  "arguments": {
    "name": "ICP: US software, 200 to 1,000",
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

### 3. `trayo_v2_search_companies`

Send at most 50 of your best companies as `similarTo.seeds`, inline. A list sent as seeds must hold 50 or fewer. `sameSize` is `true` by default. With 3 or more seeds of known size, it keeps companies inside their employee range.

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
          "domain": "datadoghq.com"
        },
        {
          "domain": "snowflake.com"
        }
      ]
    },
    "filters": {
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

### 4. `trayo_v2_add_list_items` (optional)

Add the similar companies you keep to the same list.

```json
{
  "tool": "trayo_v2_add_list_items",
  "arguments": {
    "id": "<id from an earlier result>",
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

## Then

Send the list as `companies` to a discovery. Or send it as `employers`, with `titles`, to a people search, as in the skill `people-at-accounts`. These fields take a list of at most 200. To start from the names of your customers instead, see the skill `similar-companies`.
