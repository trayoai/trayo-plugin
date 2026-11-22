---
name: contacts-at-accounts
description: "Get work emails and phone numbers for the right people at target companies with Trayo. Use when the user wants to reach the people who matter at their accounts. Lookups use credits."
---

# Get emails and phones for the right people at your companies

You have target companies, and you want to reach the people who matter there.

**Cost:** The title search is paced `heavy` and is free. It holds a model running slot. Contacts are paced `model`: 15 credits for each email lookup, 20 credits for each phone lookup that starts. An answer Trayo already holds is free.

## Before you start

- These steps use the Trayo MCP tools, named `trayo_v2_*`. If none are available, Trayo is not connected or needs sign-in: ask the user to connect the Trayo MCP server and sign in with their Trayo account (in Claude Code, run `/mcp`, select `trayo` and choose Authenticate). Sign-in uses OAuth in the browser; do not look for API keys or other credentials.
- Read `trayo_v2_get_workspace` first. It holds what the workspace sells (`seller`), its `stakeholders`, its ideal customer profile (`icp`) and its saved `signals`. Ask the user only for missing information that changes the result.
- The calls below are examples. Replace their values with the user's request and with ids from earlier results.
- This workflow grants no permission to spend credits or to change the workspace. Run paid or write steps only within what the user asked for.
- When a result lists `next` calls, send them with their arguments unchanged, after `afterSeconds`. Read `notes`, `errors` and `unresolved` before you say coverage is complete or nothing matched.
- If the workspace and the request do not answer it, ask: Do you need phone numbers? A phone lookup charges more and takes minutes, so ask for email only unless you will call.

## Steps

### 1. `trayo_v2_search_people`

Send `employers` (inline or as a list) and `titles: { "any": [...] }`.

```json
{
  "tool": "trayo_v2_search_people",
  "arguments": {
    "employers": [
      {
        "domain": "stripe.com"
      },
      {
        "domain": "datadoghq.com"
      }
    ],
    "titles": {
      "any": [
        "vp sales",
        "head of sales"
      ]
    },
    "perCompany": 2
  }
}
```

### 2. `trayo_v2_lookup_contacts`

Send at most 10 people in `people`, inline or as a list of at most 10, with `fields: ["email"]` or `["email", "phone"]`. Emails come back in the response. An email with `status: "unconfirmed"` can belong to another person. Check it before you send to it.

```json
{
  "tool": "trayo_v2_lookup_contacts",
  "arguments": {
    "people": [
      {
        "id": "jane-doe"
      },
      {
        "linkedinUrl": "https://www.linkedin.com/in/john-smith"
      }
    ],
    "fields": [
      "email"
    ]
  }
}
```

### 3. `trayo_v2_get_contact_lookup` (optional)

Get each `pending` phone by its `lookupId`, every 10 to 15 seconds, until it is no longer `pending`.

```json
{
  "tool": "trayo_v2_get_contact_lookup",
  "arguments": {
    "lookupId": "<lookupId from an earlier result>"
  }
}
```

## Then

For more than 10 people, send them 10 at a time.
