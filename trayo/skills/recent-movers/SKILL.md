---
name: recent-movers
description: Find people who recently started a new role, such as a new head of sales, after working at a company that matters to the user, such as a customer or a competitor, with Trayo. Use when the user wants new hires who came from specific companies.
---

# Find people who started a new role after working somewhere that matters

You want new hires, for example a new head of sales, who came from your customers or a competitor.

**Cost:** Paced `heavy`. Free.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_search_people`

Send `employerFilters`, `titles: { "any": [...] }`, `currentRole.startedAfter` (a month, `YYYY-MM`) and `history.employers`. `employerFilters` must hold `industries`, `hq.cities`, `hq.states` or `headcount`, or the search fails with `find_needs_indexed_filter`. A page can hold fewer people, even none, while `nextCursor` continues.

```json
{
  "tool": "trayo_v2_search_people",
  "arguments": {
    "employerFilters": {
      "industries": [
        "software"
      ],
      "headcount": {
        "min": 200,
        "max": 5000
      }
    },
    "titles": {
      "any": [
        "head of sales",
        "vp sales",
        "chief revenue officer"
      ]
    },
    "currentRole": {
      "startedAfter": "2026-07"
    },
    "history": {
      "employers": {
        "listId": "5f0c2a9e-8d1b-4c7a-9e3f-2b6d4a1c8e70"
      }
    },
    "limit": 100
  }
}
```

## Then

This is a list of who moved, as of now. To learn of new moves over time, start a `job_change` discovery with `direction: "left"` over the companies in `history.employers`. Each result names where the person went.
