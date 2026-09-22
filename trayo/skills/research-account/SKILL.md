---
name: research-account
description: Research one account — what the company does, why now, who the stakeholders are, and what has happened at it. Use when the user names a company and asks for a brief, a profile, "tell me about", "who should I talk to at", or pre-meeting prep.
---

# Research an account

Collection results may use `delivery: "file"`. In that case, `preview` and `metadata` are compact and may be shortened; download `file.downloadUrl` and process the complete JSON in code before selecting or importing rows. If the download is blocked, as in Claude Cowork, read the same result with `trayo_read_result { resultId }` and follow `page.nextCursor` while `page.hasMore` is true; this never repeats the search. Keep the original `hasMore`/`nextCursor` pagination, and do not repeat the search to get its file. Use `output: "file"` when a download is wanted, or `output: "pages"` when you cannot download files.

1. If the user named a company that may already be in the workspace, call `trayo_list_accounts` with `{ q: name }` to recover its `accountId`; check the returned name and URL before using it. Then call `trayo_research_company` with `{ company: { accountId } }`, or `{ company: { website } }` when it is not there — `accountId` goes on its own, never beside `website`, `linkedinUrl` or `name`. It answers the overview in `research`, the same content as `reportMarkdown`, and the company as resolved.
2. `trayo_search_stakeholders` with the same `company` and, if the user described the roles they sell to, that prose as `definition`: 5 people with `whyThisPerson` by default, so pass `limit: 10` when the user wants up to ten. Read `candidates` next to `people` — a positive `candidates` with an empty `people` means none of them fit the definition, which is an answer, not a failure.
3. If the company is an account in the workspace, `trayo_list_events` with `{ accountId }` for what has happened at it; otherwise say events need the account imported and a discovery run (skill `scan-for-signal`).
4. Build one brief: what they do, why now, the stakeholders with their reasons, recent events with their `eventDate` and the `signalKeys` each one matched — every claim from a tool result, none invented.

Check `company.name` and `company.website` on both answers before trusting either: a common name or a guessed handle resolves to a different company, and the people would be theirs. `company_not_found` is `do_not_retry` — the same reference keeps missing, so send the website or company profile URL instead.

## Finish

Hand back the brief in chat: what they do, why now, the stakeholders with their reasons, recent events with their `eventDate` and the `signalKeys` each one matched — every claim from a tool result, none invented.

By now you must have: checked `company.name` and `company.website` on both answers before trusting either.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: `trayo_add_people` with the step-2 rows as they came back — `headline`, `location` and `whyThisPerson` have no column on a person and are dropped, so copy the reason into `note` yourself if it is worth keeping — and add `accountId` (from `company.accountId`, when the company is an account of yours) or `company: { name, domain }` (`company.website` is the domain) to each row, or they land unlinked. Then `trayo_add_to_list` with ids from both `created` and `updated`; `updated` means a LinkedIn or email match was written with the fields you sent. A name-only duplicate is skipped unchanged, so use its `existingId` only after confirming it is the same human. `reasonCode: "identity_conflict"` means LinkedIn and email identify different people; send one identity, or PATCH the intended record. Read `degraded`: `no_account` is a row with no account, `no_identity` a row with neither a LinkedIn nor an email, which a re-run creates a second time. Say so rather than reporting a clean import. For events at a company that is not an account yet, skill `scan-for-signal`.
- Re-run it on your cadence: recipe `brief-before-outreach` at `https://api.trayo.ai/v1/recipes`.
- Hand it off: the brief written to a file the user names.
