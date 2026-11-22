---
name: posts-to-people
description: "Find the people who wrote LinkedIn posts, from post URLs or from a topic, with Trayo. Use when the user pastes post links or wants the authors who write about something."
---

# Find the people behind LinkedIn posts, from their URLs or their words

You have LinkedIn post URLs, or a topic, and you want the people who wrote the posts.

**Cost:** Free. Resolve is paced `standard`, and a search with only `keywords` is paced `heavy`.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_resolve_posts`

Send the post URLs as `posts`. A share URL works too. Each `matched` entry has the `post`, with its `author` and `company`.

```json
{
  "tool": "trayo_v2_resolve_posts",
  "arguments": {
    "posts": [
      {
        "url": "https://www.linkedin.com/feed/update/urn:li:activity:7381234567890123456/"
      }
    ]
  }
}
```

### 2. `trayo_v2_search_posts` (optional)

Or send only `keywords`. The pages hold every post of at most 8 days that contains them, newest first.

```json
{
  "tool": "trayo_v2_search_posts",
  "arguments": {
    "keywords": {
      "all": [
        [
          "salesforce",
          "hubspot"
        ],
        "migration"
      ]
    },
    "publishedAfter": "2026-10-08",
    "publishedBefore": "2026-10-14"
  }
}
```

### 3. `trayo_v2_search_people` (optional)

Judge the authors for fit: send them as `within`, with `qualify`.

```json
{
  "tool": "trayo_v2_search_people",
  "arguments": {
    "within": [
      {
        "id": "jane-doe"
      }
    ],
    "qualify": {
      "criteria": [
        "Owns the CRM budget at the company"
      ]
    }
  }
}
```
