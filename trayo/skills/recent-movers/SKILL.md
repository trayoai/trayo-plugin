---
name: recent-movers
description: Find people who recently changed jobs — who left a company, who joined one, or who moved between two. Use when the user asks about "recent hires at", "who left", "job changes", "past champions who moved".
---

# Recent movers

Collection results may use `delivery: "file"`. In that case, `preview` and `metadata` are compact and may be shortened; download `file.downloadUrl` and process the complete JSON in code before selecting or importing rows. If the download is blocked, as in Claude Cowork, read the same result with `trayo_read_result { resultId }` and follow `page.nextCursor` while `page.hasMore` is true; this never repeats the search. Keep the original `hasMore`/`nextCursor` pagination, and do not repeat the search to get its file. Use `output: "file"` when a download is wanted, or `output: "pages"` when you cannot download files.

1. `trayo_search_job_changes` with `destination: { website }` for who joined, `source: { website }` for who left, or both for moves from one to the other. At least one of the two is required; add `detectedSince` to narrow the 90-day window. Each row: the `person`, both roles under `source` and `destination`, `detectedAt` and `startedAt`. At most 25 rows come back, most recently detected first, one row per person per destination.
2. To watch hires and promotions at a company, create a `job_change` signal and use the `scan-for-signal` skill. While the run is active, keep polling it. After it settles, read `run.error` and `run.blockedSignals`. Follow the recovery steps in `scan-for-signal` for `account_not_ready` or `company_not_found`.

`detectedAt` is when Trayo first saw the new role, not the start date. `startedAt` is the start date, to the month (`2026-03`, or `2026` when only the year is known, or null when we hold none) — use it for "who joined in the last N weeks", and expect nulls.

`detectedSince` is the only filter the tool takes. It keeps moves with `detectedAt >=` the date you send — the date Trayo DETECTED the move, not `startedAt`, which cannot be filtered. It only narrows the 90-day window, starting at midnight UTC 90 days ago: an earlier value is clamped to that start, and a future value matches nothing. Use it for "moves observed in the last two weeks". For "people who joined in the last two weeks", inspect `startedAt` in the returned rows and explain its month-level precision and missing values; detection recency does not establish when someone joined.

Destination searches already return the newest moves first: narrowing the window does not recover omitted matches; it returns the same rows or a subset. This is a recency filter, not pagination. Do not repeatedly narrow just to clear `hasMore`, or change the user's requested period without agreement. Scheduled polling is also best-effort: more than 25 matches between checks can leave moves unread.

`hasMore: true` means the 25-row cap was reached and more matches exist. The tool does not paginate, so there is no next page to fetch. Report truncation for the requested period rather than implying the 25 rows are everything. Only narrow the company selectors when that still answers the user's question.

Read `sampled` before interpreting the answer. `true` means only `source` was sent: the tool read a small fixed sample of recent moves and kept the ones that left that company. An empty answer does not mean nobody left, and retrying gives the same answer while the underlying data is unchanged. Say "the search found no one in its sample", never "nobody left". `false` means `destination` was sent: the tool read a bounded slice of the newest moves into that company before filtering by source. Matching moves may sit outside that slice, so `hasMore: false` does not prove completeness with either value of `sampled`. For an empty destination search, say "the search found no matching moves in the slice it searched". The `job_change` signal in step 2 watches hires and promotions at the watched company; it is not a departure search and does not provide a complete list of who left.

Promotions are never in these rows. Every row is a move between two companies, so a promotion or title change inside one company does not appear here however recent it is. When the user asks about promotions or internal moves, go straight to the `job_change` signal in step 2 (`trayo_create_signal`, then `trayo_run_discovery`), which does report them, and say why the search could not.

## Finish

Hand back the movers with their old and new role and the date — `startedAt` when held, else `detectedAt` — and say when `hasMore` cut the answer at 25.

By now you must have: reported any truncation for the requested period rather than implying 25 rows are everything; never treat an empty answer or `hasMore: false` as proof that nobody moved; asked before running discovery on more than 100 accounts.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: `trayo_add_people` with up to 200 rows of `{ fullName, title, linkedinUrl }` taken from each `person`, plus `company: { name: destination.name, domain: destination.website }` to file them under the company they joined — `destination.accountId` is only populated when step 1 named that company by `accountId`, so do not read it as a lookup. Then `trayo_add_to_list` with ids from both `created` and `updated`; an `updated` row matched an existing person by LinkedIn or email and wrote the mover fields you sent. A `skipped` row marked `reasonCode: "duplicate"` is a name-only match left unchanged, so use its `existingId` only after confirming it is the same human. `reasonCode: "identity_conflict"` means LinkedIn and email identify different people; send one identity, or PATCH the intended record. Read `degraded`: `no_account` is a row with no account, `no_identity` a row with neither a LinkedIn nor an email, which a re-run creates a second time. Say so rather than reporting a clean import. To keep watching, the `job_change` signal in step 2.
- Re-run it on your cadence: recipe `recent-movers` at `https://api.trayo.ai/v1/recipes`.
- Hand it off: a CSV written from the rows you hold.
