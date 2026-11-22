---
name: people-at-accounts
description: "Find people with given titles at the user's target companies, then qualify them against a plain-language rule, with Trayo. Use when the user knows the titles they want at their accounts."
---

# Find the right people at your companies, then qualify them

You know the titles you want, and you have a plain-language rule for who fits.

**Cost:** Paced as `model`. Each person gets an automatic role check, shared with any `qualify` criteria. A page reads at most 100 people. Free.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_search_people`

Send `employers`, inline or as a list such as the one of the skill `icp-account-list`, and `titles: { "any": [...] }`. For the buyers the workspace saved, send the `title` of each of its `stakeholders` as `titles.any`. Add `qualify.criteria` to judge each page. Each company adds at most `perCompany` people (default 4).

```json
{
  "tool": "trayo_v2_search_people",
  "arguments": {
    "employers": {
      "listId": "5f0c2a9e-8d1b-4c7a-9e3f-2b6d4a1c8e70"
    },
    "titles": {
      "any": [
        "revenue operations",
        "revops"
      ]
    },
    "qualify": {
      "criteria": [
        "Owns the revenue operations function"
      ]
    },
    "limit": 25
  }
}
```

### 2. `trayo_v2_create_list` (optional)

Keep the people who passed as a `people` list. This needs `lists:write`.

```json
{
  "tool": "trayo_v2_create_list",
  "arguments": {
    "name": "RevOps leaders",
    "type": "people",
    "items": [
      {
        "id": "jane-doe"
      }
    ]
  }
}
```
