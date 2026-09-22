---
name: build-account-list
description: Find similar companies from examples, or build a target account list from ICP criteria. Use when the user asks for "companies like these", "lookalikes", "find companies that…", "build a list of accounts", or describes an ideal customer.
---

# Build an account list

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
2. Turn the criteria into a `trayo_find_companies` call. Exact attributes go in `filters` — `industries`, `headcount`, `hq`, `fundingStages`, `foundedYear`, `technologies`, `companyTypes` — and the rest of the description goes in `query`. If you do not know the exact industry wording, call `trayo_list_industries` with a useful `contains` fragment and use one of the returned values. A search with a `query` returns one ranked page and rejects a `cursor`, so only a filters-only search pages. Page with `cursor` while `hasMore` is true — send the cursor back verbatim in the SAME request, with the same `filters`. It is a position, not a saved search: paired with different filters it silently returns that position in a different result set, with no error. Stop at the size the user asked for.
3. Show the user the candidates (`name`, `website`, `headcount`, `hq`, and `why` when it is there — `why` is the ranking reason and is null on a filters-only search, which has no ranking to explain). Rows with `state: alreadyAdded` are already in the workspace — say so, do not re-import them. Nothing is saved yet: refine `filters` or `query` and search again until the user approves the list.
4. Import the chosen rows with `trayo_import_accounts`: `{ name, url }` per row, up to 200 per call. Take `url` from the row — it is the website carrying its `https://` scheme, which the import requires, while `website` is the bare host and would fail the whole call. Skip rows whose `url` is null. Read `created[].id`, and for each `skipped` row with `reasonCode: "duplicate"` read `existingId` — that is the account already in the workspace, and it works as an `accountId` everywhere a created one does. Importing adds accounts only, never people. If the user wants people at these accounts, continue with skill `find-stakeholders`: search with `trayo_find_people` (`filters.companyWebsites` set to the imported websites) or `trayo_search_stakeholders`, iterate, then add the picks with `trayo_add_people` and the `accountId`s you just collected.

Rules: every tool error carries `code` and `retry` — `fix_input` change the arguments, `retry_later` repeat later, `do_not_retry` stop. `find_needs_indexed_filter` means the filters alone cannot select a set: add `industries`, an `hq.cities` or `hq.states`, or a `headcount` band, or send a `query`.

## Scale an approved preview

For “now give me 1,000,” call `trayo_find_companies` again with the approved exact filters and sort, `limit: 1000`, `output: "file"` (or `"pages"` when downloads are blocked), and no cursor. This requests a total including the preview. Download `file.downloadUrl` and process it in code. Check actual `rowCount`, `collection.stopReason` (file/inline) or first-page `metadata.collection.stopReason` (pages), and `hasMore`; continue with `nextCursor` and the remaining count if needed. Do not import unless requested. Sentence searches and lookalikes keep their existing limits: preview equivalent exact filters before scaling, without dropping semantic conditions.

## Finish

Hand back the candidates the user approved — `name`, `website`, `headcount`, `hq`, and `why` when it is there — and, once imported, their account ids with the duplicates' `existingId`.

By now you must have: shown the candidates and searched again until the user approved the list; imported only what they approved.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: `trayo_add_to_list` `{ name, members: [{ accountId, via: 'find' }] }`, then read `skipped`, which holds the rows already on it. Over 200 members takes several calls: send `name` on the first one only, then the `list.id` it answers with as `listId`, or two by-name calls race and split the set across two lists with the same name. For the people at these accounts, skill `find-stakeholders`.
- Re-run it on your cadence: recipe `exact-prospecting` (criteria) or `lookalike-companies` (examples) at `https://api.trayo.ai/v1/recipes`, or `POST /v1/accounts/batch` to push a list of your own.
- Hand it off: a CSV written from the rows you hold.
