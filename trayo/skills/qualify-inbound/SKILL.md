---
name: qualify-inbound
description: Qualify inbound companies and people (sign-ups, leads or a spreadsheet) against the user's rules with Trayo. Use when the user wants to know which leads fit their ideal customer profile or criteria.
---

# Qualify inbound companies and people against your rules

Sign-ups, leads or a spreadsheet name companies and people, and you want to know which of them fit.

**Cost:** Resolve by domain is paced `standard`, and resolve by name `heavy`. Company search is free and paced `heavy`. A page checks up to 100 companies. People search with `qualify` is free and paced `model`.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.
- If the workspace and the request do not answer it, ask: What makes a company or a person a fit? Write each rule as one complete fact.

## Steps

### 1. `trayo_v2_resolve_companies`

Resolve the companies by domain, and keep each `id`.

```json
{
  "tool": "trayo_v2_resolve_companies",
  "arguments": {
    "companies": [
      {
        "domain": "acme.io"
      },
      {
        "domain": "globex.com"
      }
    ]
  }
}
```

### 2. `trayo_v2_search_companies`

Send them as `within`, with `filters` and any `qualify` criteria. Automatic `quality` checks apply to every company. With `includeRejected: true`, rejected companies return with their scores. Failed judgments stay in `unjudged`, outside matched `data`. A `named_companies_filtered` note names the companies that `filters` left out.

```json
{
  "tool": "trayo_v2_search_companies",
  "arguments": {
    "within": [
      {
        "id": "co_4kQ9mVt2LpR8sWzB4nAeXy"
      },
      {
        "domain": "globex.com"
      }
    ],
    "filters": {
      "headcount": {
        "min": 50
      }
    },
    "qualify": {
      "criteria": [
        "Sells software to other businesses",
        "Has a sales team of 10 or more people"
      ]
    },
    "includeRejected": true,
    "limit": 100
  }
}
```

### 3. `trayo_v2_resolve_people` (optional)

Resolve the people you know only by name, with their `company`. Keep the `id` of each `matched` person.

```json
{
  "tool": "trayo_v2_resolve_people",
  "arguments": {
    "people": [
      {
        "name": "Jane Doe",
        "company": {
          "domain": "acme.io"
        }
      }
    ]
  }
}
```

### 4. `trayo_v2_search_people`

Send the people as `within`, by LinkedIn page or `id`, with `titles` and `qualify`. A person that `titles` removes does not come back with `includeRejected`.

```json
{
  "tool": "trayo_v2_search_people",
  "arguments": {
    "within": [
      {
        "linkedinUrl": "https://www.linkedin.com/in/jane-doe"
      }
    ],
    "titles": {
      "any": [
        "revenue operations",
        "revops",
        "sales operations"
      ]
    },
    "qualify": {
      "criteria": [
        "Owns the revenue operations function"
      ]
    },
    "includeRejected": true,
    "limit": 25
  }
}
```

## Then

Send `model` calls one or two at a time. For more than one page, follow `nextCursor` with the same arguments.
