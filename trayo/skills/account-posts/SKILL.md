---
name: account-posts
description: "Read what people at the user's companies, or people they name, post on LinkedIn about a topic, with Trayo post search. Use for raw post evidence by author, company or topic."
---

# Read what people at your companies post on LinkedIn

You want the LinkedIn posts of the people at your companies, or of people you know, about a topic you name.

**Cost:** Free. A posts search is paced `heavy` with `companies`, and `standard` with `authors`.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.

## Steps

### 1. `trayo_v2_search_posts`

Send your companies as `companies`: a list, or up to 200 references. Send the words as `keywords`. A post matches when it contains one phrase of `any`, every entry of `all`, and no phrase of `exclude`. Posts come newest first.

```json
{
  "tool": "trayo_v2_search_posts",
  "arguments": {
    "companies": {
      "listId": "5f0c2a9e-8d1b-4c7a-9e3f-2b6d4a1c8e70"
    },
    "keywords": {
      "any": [
        "sales forecasting",
        "pipeline review"
      ],
      "exclude": [
        "we are hiring"
      ]
    },
    "publishedAfter": "2026-09-15",
    "limit": 50
  }
}
```

### 2. `trayo_v2_search_posts` (optional)

To read the posts of people you know instead, send them as `authors`. Leave out `keywords` to get all their posts. Send the same arguments with `cursor` set to `nextCursor` until it is `null`.

```json
{
  "tool": "trayo_v2_search_posts",
  "arguments": {
    "authors": [
      {
        "id": "jane-doe"
      },
      {
        "linkedinUrl": "https://www.linkedin.com/in/john-smith"
      }
    ],
    "publishedAfter": "2026-08-01"
  }
}
```

### 3. `trayo_v2_lookup_contacts` (optional)

Each post has its `author` as a person. Send the authors you want to reach as `people`.

```json
{
  "tool": "trayo_v2_lookup_contacts",
  "arguments": {
    "people": [
      {
        "id": "jane-doe"
      }
    ],
    "fields": [
      "email"
    ]
  }
}
```

## Then

Run the search again each day. Set `publishedAfter` 14 days before the last run, because posts arrive late. Keep only the posts whose `id` you do not hold yet.
