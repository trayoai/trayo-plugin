---
name: research-accounts
description: "Research a few companies or people with Trayo and get an overview written for what the user sells. Use for account research, person research or meeting prep before outreach."
---

# Get an overview of companies and people before outreach

You picked a few companies or people, and you want an overview written for what you sell.

**Cost:** Paced `model`. 5 credits for each company overview and 5 credits for each person overview. The key needs `research:run`.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_research_companies`

Send at most 10 companies and `seller`. Each entry has `research.whyNow` and `research.fit`.

```json
{
  "tool": "trayo_v2_research_companies",
  "arguments": {
    "companies": [
      {
        "domain": "datadoghq.com"
      },
      {
        "id": "co_4kQ9mVt2LpR8sWzB4nAeXy"
      }
    ],
    "seller": {
      "name": "Acme",
      "offering": "Revenue operations software for B2B sales teams",
      "target": "B2B software companies with 200 to 2,000 employees"
    }
  }
}
```

### 2. `trayo_v2_research_people` (optional)

Send at most 10 people. With `grounded: true`, send at most 5, and each overview also reads the web. If a person fails with `person_profile_too_thin`, send them again with `grounded: true`.

```json
{
  "tool": "trayo_v2_research_people",
  "arguments": {
    "people": [
      {
        "linkedinUrl": "https://www.linkedin.com/in/jane-doe"
      }
    ],
    "grounded": false,
    "seller": {
      "name": "Acme",
      "offering": "Revenue operations software for B2B sales teams",
      "target": "B2B software companies with 200 to 2,000 employees"
    }
  }
}
```
