---
name: build-account-list
description: Find similar companies from examples, or build a target account list from ICP criteria. Use when the user asks for "companies like these", "lookalikes", "find companies that…", "build a list of accounts", or describes an ideal customer.
---

# Build an account list

If the Trayo tools (`trayo_whoami` and the rest) are not listed, the Trayo server may still be connecting: some clients start the first answer before it is ready, and the tools appear a few seconds later. Check the current tool list again before you tell the user Trayo is not connected, and check it on every turn instead of repeating an earlier answer. If the tools are still missing, tell the user how to reconnect: in Codex, run `codex mcp login trayo` and restart Codex; in Claude Code, run `/mcp`, select **trayo** and choose **Authenticate**; in Gemini CLI, run `/mcp auth trayo`; in Cursor, sign in to the Trayo server from its MCP settings.

**Find, then add.** Search, find and research tools save nothing, so you can run a search again as often as needed. Iterate until the set is right, and add only what the user approved. Adding (`trayo_import_accounts` for companies, `trayo_add_people` for people) is how you save them.

Collection results may use `delivery: "file"`. In that case, `preview` and `metadata` are compact and may be shortened; download `file.downloadUrl` and process the complete JSON in code before selecting or importing rows. If the download is blocked, as in Claude Cowork, read the same result with `trayo_read_result { resultId }` and follow `page.nextCursor` while `page.hasMore` is true; this never repeats the search. Keep the original `hasMore`/`nextCursor` pagination, and do not repeat the search to get its file. Use `output: "file"` when a download is wanted, or `output: "pages"` when you cannot download files.

## Start from example companies

Call `trayo_find_lookalikes` with `{"companies":[{"linkedinUrl":"https://www.linkedin.com/company/stripe"}],"limit":100}`. Send 1–50 companies and ask for up to 500 results total. Each company can include `linkedinUrl`, `website` and `name`; matching tries them in that order.

For an exact reference, send `{"companyId":6871792}` instead. `companyId` also accepts a numeric string. Reuse `companyId` from a lookalike result or `id` from a known company find result; a workspace account UUID is a different identifier. A supplied `companyId` takes precedence over the other fields, and an unknown ID is reported as `not_found` without falling back to them.

Read `seeds` to confirm the matched identities and flag any `not_found` or `not_indexed` inputs. Show `companies` in their returned order, which is best match first, with `similarity` (high/medium/low) and `similarityScore`. The bands are preliminary. This is one search with no pagination; nothing is saved.

Results leave out the seeds' own subsidiaries and sister brands, repeat listings of one company, and companies outside the seeds' employee range. `filtered` counts each and gives `seedSizeRange`; tell the user when many were left out. When the seeds are competitors in one niche rather than the user's accounts or target accounts, send `"matchSize": false` so smaller and larger companies doing the same thing are kept. Results also rank higher when people at the workspace's accounts used to work there; `rankedByYourAccounts` says how many were lifted. Send `"useWorkspaceAccounts": false` only when the user wants the seeds alone to decide.

If the user also wants the results saved, import selected companies with `trayo_import_accounts` in batches of 200: send `name` and `url`, using the `website` as `url` and adding `https://` if it has no scheme. When `linkedinUrl` is present, also send its bare company handle as `linkedinHandle`. Skip rows without a name or usable website. Read `created[].id` and duplicate rows' `existingId`, then use those account IDs when you offer the list in Finish.

## Start from criteria

1. `trayo_whoami` once: the workspace you act in.
2. Use `trayo_find_companies` with `mode: "direct"`, exact `filters` and no `query`. Map the request to `industries`, `headcount`, `hq`, `fundingStages`, `foundedYear`, `technologies` or `companyTypes`; use `trayo_list_industries` with a useful `contains` fragment for accepted industry values. If the company must have someone in a role, add `filters.title.any`, for example `["cto", "chief technology officer"]`: each company is returned once when it has a matching current employee. Expand equivalent title spellings, keeping independent requirements and exclusions intact. Preserve numeric bounds, geography and dates. A requirement such as selling to hospitals is not an industry filter; say when a requirement cannot be checked and qualify candidates with evidence before calling them matches. Each call returns at most 100 records. Page with `nextCursor` sent back as `cursor`, unchanged filters and sort, while `hasMore` is true; keep direct mode and stop at the requested count. Start a new search without the old cursor if criteria change.
3. Show the user the candidates (`name`, `website`, `headcount`, `hq`, and `why` when it is there — `why` is the ranking reason and is null on a filters-only search, which has no ranking to explain). Direct search can return companies without websites; retain them in the search results and explain if they cannot be imported. Rows with `state: alreadyAdded` are already in the workspace — say so, do not re-import them. Nothing is saved yet: refine the direct filters and search again until the user approves the list.
4. Import the chosen rows with `trayo_import_accounts`: `{ name, url }` per row, up to 200 per call. Take `url` from the row — it is the website carrying its `https://` scheme, which the import requires, while `website` is the bare host and would fail the whole call. Skip rows whose `url` is null. Read `created[].id`, and for each `skipped` row with `reasonCode: "duplicate"` read `existingId` — that is the account already in the workspace, and it works as an `accountId` everywhere a created one does. Importing adds accounts only, never people. If the user wants people at these accounts, continue with skill `find-stakeholders`: search with `trayo_find_people` (`filters.companyWebsites` set to the imported websites) or `trayo_search_stakeholders`, iterate, then add the picks with `trayo_add_people` and the `accountId`s you just collected.

When semantic ranking is needed, the existing sentence search accepts `query` without direct mode. It returns one ranked page, at most 50 companies, and rejects a cursor. Keep exact filters where supported and explain any requirement they cannot enforce. Do not switch modes silently to recover from a thin or failed direct search.

Rules: every tool error carries `code` and `retry` — `fix_input` change the arguments, `retry_later` follow the retry delay, `do_not_retry` stop. Busy, unavailable and timeout responses are failures, never proof of no matches. Keep retries sequential; report persistent failure instead of looping or dropping constraints. `find_needs_indexed_filter` means the filters cannot select a bounded set: use an `industries`, `hq.cities`, `hq.states` or `headcount` constraint from the request, or ask the user to narrow it. Do not invent an extra constraint. Read `truncated` and notes before claiming completeness.

## Scale an approved preview

For a direct-search total such as 1,000, count the preview's full results toward the total, then keep `mode: "direct"` and follow its search `nextCursor`. Request `limit: 100` or the remaining count if smaller, with unchanged filters and sort. Read each full result using `output: "file"` or `"pages"`, combine and deduplicate in code, and stop at the requested count or when `hasMore` is false. State any truncation or shortfall. Neither delivery option increases the search page limit. Never send `limit: 1000` in direct mode or remove the mode to bypass that limit. Do not import unless requested.

For an existing filters-only preview made without direct mode, the bulk call still accepts `limit: 1000`, unchanged filters and sort, `output: "file"` (or `"pages"`), and no cursor for a total including the preview. Check `rowCount`, `collection.stopReason` and `hasMore`; continue with `nextCursor` as needed. Sentence searches and lookalikes keep their existing single-page limits; never drop a semantic condition to reach a larger count.

## Finish

Hand back the candidates the user approved — `name`, `website`, `headcount`, `hq`, and `why` when it is there — and, once imported, their account ids with the duplicates' `existingId`.

By now you must have: shown the candidates and searched again until the user approved the list; imported only what they approved.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: `trayo_add_to_list` `{ name, members: [{ accountId, via: 'find' }] }`, then read `skipped`, which holds the rows already on it. Over 200 members takes several calls: send `name` on the first one only, then the `list.id` it answers with as `listId`, or two by-name calls race and split the set across two lists with the same name. For the people at these accounts, skill `find-stakeholders`.
- Run it again on request: recipe `exact-prospecting` (criteria) or `lookalike-companies` (examples) at `https://api.trayo.ai/v1/recipes`, or `POST /v1/accounts/batch` to push a list of your own.
- Hand it off: a CSV written from the rows you hold.
