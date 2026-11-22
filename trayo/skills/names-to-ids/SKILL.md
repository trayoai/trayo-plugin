---
name: names-to-ids
description: Match a spreadsheet or list of company names, domains or LinkedIn pages to exact Trayo company ids, and settle ambiguous names. Use when the user has rows of companies to match before a search, discovery or list.
---

# Turn a spreadsheet of companies into Trayo ids

Your rows have company names, domains or LinkedIn pages, and you want exact ids for every later call.

**Cost:** Paced `standard` when every entry has a domain, LinkedIn page or `id`, and `heavy` when any entry is a name. Free.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.
- If the workspace and the request do not answer it, ask: Do your rows have a website or LinkedIn column? Send it for each row that has one, and send a name only for the rows without one.
- If the workspace and the request do not answer it, ask: What do you want for a name that stays `ambiguous`: show the candidates to a person, or skip it?

## Steps

### 1. `trayo_v2_resolve_companies`

Send each row as one entry of `companies`, with what it has: `domain`, `linkedinUrl` or `name`. Send at most 100 entries, and at most 25 names. A name after the first 25 comes back `failed`.

```json
{
  "tool": "trayo_v2_resolve_companies",
  "arguments": {
    "companies": [
      {
        "domain": "stripe.com"
      },
      {
        "linkedinUrl": "https://www.linkedin.com/company/datadog"
      },
      {
        "name": "Ramp",
        "country": "US"
      }
    ]
  }
}
```

### 2. `trayo_v2_resolve_companies` (optional)

Send each `ambiguous` name again with its `country` and `city`. Or show the `candidates` to a person, who picks one.

```json
{
  "tool": "trayo_v2_resolve_companies",
  "arguments": {
    "companies": [
      {
        "name": "Ramp",
        "country": "US",
        "city": "New York"
      }
    ]
  }
}
```

### 3. `trayo_v2_resolve_companies` (optional)

Keep the matched entries. Send only the `failed` names again, later, a few times at most. Do not send the same batch again and again. A name that fails each time goes to a person to check, not to `not_found`.

```json
{
  "tool": "trayo_v2_resolve_companies",
  "arguments": {
    "companies": [
      {
        "name": "A. O. Smith"
      }
    ]
  }
}
```

### 4. `trayo_v2_create_list` (optional)

Keep the matched companies as a `companies` list. Send at most 100 as `items`, as they came back. Add the rest with `trayo_v2_add_list_items`. Or keep the ids in your own storage.

```json
{
  "tool": "trayo_v2_create_list",
  "arguments": {
    "name": "Target accounts",
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
