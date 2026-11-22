---
name: builtin-company-lists
description: Start from a built-in Trayo company list: S&P 500, Fortune 500, Fortune 1000, Inc. 5000, active Y Combinator companies or Cloud 100. Use when the user names one of these lists, or wants accounts from one narrowed to their market.
---

# Use a built-in company list

Start from S&P 500, Fortune 500, Fortune 1000, Inc. 5000, Active YC companies, Cloud 100. These lists are available to every API workspace.

**Cost:** List reads are paced `standard`. Company search is free and uses its usual cost class. Optional list creation needs `lists:write`.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_list_lists` (optional)

Discover the catalog if needed. Built-in lists use reserved ids such as `fortune_1000`. You can use these ids directly.

```json
{
  "tool": "trayo_v2_list_lists",
  "arguments": {
    "type": "companies",
    "limit": 100
  }
}
```

### 2. `trayo_v2_get_list`

Send the reserved id `fortune_1000` directly. Read `source.edition`, `source.asOf`, `source.companyCount`, `source.unresolvedCount`, and `itemCount` before claiming coverage. The list is read-only.

```json
{
  "tool": "trayo_v2_get_list",
  "arguments": {
    "id": "fortune_1000"
  }
}
```

### 3. `trayo_v2_list_items`

Use that built-in list id. Keep each item’s `company` as a reference. Follow `nextCursor` as `cursor` until it is `null`. Send each page to the next step before reading another page. Split references into batches that fit the next call.

```json
{
  "tool": "trayo_v2_list_items",
  "arguments": {
    "id": "fortune_1000",
    "limit": 100
  }
}
```

Repeat until `nextCursor` is `null`.

### 4. `trayo_v2_search_companies`

Send the company references from each page as `within`, with the filters you need. Follow every search page before processing another member page.

```json
{
  "tool": "trayo_v2_search_companies",
  "arguments": {
    "within": [
      {
        "id": "co_4kQ9mVt2LpR8sWzB4nAeXy"
      }
    ],
    "filters": {
      "headcount": {
        "min": 200,
        "max": 2000
      }
    },
    "limit": 100
  }
}
```

### 5. `trayo_v2_create_list` (optional)

Create a workspace list for the companies you keep, with at most 100 references as `items`. Use the returned workspace list id for later changes.

```json
{
  "tool": "trayo_v2_create_list",
  "arguments": {
    "name": "Fortune 1000 targets",
    "type": "companies",
    "items": [
      {
        "id": "co_4kQ9mVt2LpR8sWzB4nAeXy"
      }
    ]
  }
}
```

## Then

To keep more results, add them with `trayo_v2_add_list_items`, using the new workspace list id. Never change the built-in list. Or keep the company references in your own storage.
