---
name: find-intent-accounts
description: Find the companies that fit the workspace's ideal customer profile (ICP) and show buying intent now. Runs the workspace's signals on a test sample of ICP companies, ranks them by how many different signals each one hit, lets the user tune the ICP and the signals, then runs the same setup on more companies. Use when the user asks to "find companies who show intent for my company", "find in-market accounts", "who is ready to buy", "which companies are hitting our signals", or wants their top accounts by signals.
---

# Find companies showing intent

Collection results may use `delivery: "file"`. In that case, `preview` and `metadata` are compact and may be shortened; download `file.downloadUrl` and process the complete JSON in code before selecting or importing rows. If the download is blocked, as in Claude Cowork, read the same result with `trayo_read_result { resultId }` and follow `page.nextCursor` while `page.hasMore` is true; this never repeats the search. Keep the original `hasMore`/`nextCursor` pagination, and do not repeat the search to get its file. Use `output: "file"` when a download is wanted, or `output: "pages"` when you cannot download files.

The job: take companies that fit the user's ICP, run the workspace's signals on a test sample, rank the companies by how many different signals each one hit, let the user tune the ICP and the signals, then run the same setup on more companies. The user owns two checkpoints: the ICP, before any company is added, and the test result, before anything scales.

## Before anything

1. Call `trayo_whoami` once. It tells you the workspace you act in, whether work that spends may start (`canInitiate`), and whether Trayo's standing scan covers the workspace (`monitoring.enabled`). Plan against what it says.
2. Call `trayo_list_signals`. These are the intent signals, usually the ones set up with the workspace. If there are none, define some first with skill `discover-signals`, or skill `onboard-workspace` for a new workspace.

## 1. Agree on the ICP

1. Read `trayo_get_workspace`: `solutions` and `solutionsBrief` say what the workspace sells, and `stakeholderCriteria` often says who it sells to. When they say too little, ask the user who they sell to.
2. Write the ICP as `trayo_find_companies` `filters`: `industries` (exact values from `trayo_list_industries`), a `headcount` band, `hq`, and `fundingStages` or `companyTypes` when they matter. Keep it filters-only. A search with a `query` returns at most 50 companies on one page, too few to sample from.
3. Show it as "This is your ICP: …" and ask what to change, add or remove. In the same message, say what the test does once the ICP is approved: it adds 100 of these companies to the workspace, runs the signals on them (say how many) over the last 90 days, and ranks the companies by how many different signals each one hits. Search again after each change. Start only when the user approves; nothing is added before that. The companies stay in the workspace afterwards, and when `monitoring.enabled` is true, Trayo's standing scan includes them.

The approved filters are the ICP for the rest of this job. Keep them unchanged, so the scale-up searches the same companies as the test.

## 2. Test on 100 companies

1. Call `trayo_find_companies` with the approved filters, `limit: 1000` and `output: "file"` (or `"pages"` when downloads are blocked). This is the pool for the whole job; if the call stops early, continue with `nextCursor` as its result says. A filters-only search returns the largest companies first, and large companies make more news and post more jobs, so the first 100 rows overstate what a full run finds. Take 100 rows spread evenly across the pool instead (every tenth row of 1,000), and keep the rest for the scale-up. When the pool holds 100 rows or fewer, the test is the whole job. Skip rows whose `url` is null.
2. Import them with `trayo_import_accounts`: `{ name, url }` per row, taking `url` from the row because it carries the `https://` scheme, up to 200 per call. Collect `created[].id`, plus `existingId` from every `skipped` row with `reasonCode: "duplicate"`: those companies were already in the workspace and belong in the test too.
3. Start `trayo_run_discovery` `{ accountIds, signalKeys, lookbackDays: 90, waitSeconds: 45 }`, one run per group of up to 10 signals, alongside each other. A test run can take from a few minutes to over an hour. Poll each run with `trayo_get_discovery` `{ runId, waitSeconds: 45 }`, report `progress`, and offer to come back later: the run ids are all you need to pick the work up again, so give them to the user. Nothing is final until `settledAt` is set.

## 3. Rank the test and ask

1. Read every event of every run with `trayo_list_events` `{ discoveryRunId }`, following `nextCursor` while `hasMore` is true. Merge the runs' pages and deduplicate by event `id`.
2. Rank. For each account, count the distinct keys in its events' `signalKeys` that belong to the signals you ran, and keep each key's newest event (`title`, `eventDate`, `url`). Order by the most distinct signals, then by the newest `eventDate`. A signal's fire rate is the share of the tested companies it hit: divide by every company you tested, not only the ones with events. Count in code once the events run past a few pages.
3. Show the user:
   - the companies that hit several signals, most first, with one line of evidence per signal: the event `title`, its `eventDate` and its `url`;
   - every signal's fire rate, including the ones at 0%;
   - what the rest of the pool would likely give at this rate, and that runs over hundreds of companies take hours.

   Then ask: change the ICP, change the signals, or go?

When the user tunes:
- A signal that fires on more than half the test says little about intent, because every company looks active. Narrow it or leave it out.
- Before calling a signal at 0% silent, read `run.error` and `run.blockedSignals`. If it is silent, rewrite it or leave it out.
- To change a signal, create a new one with `trayo_create_signal` and run its key instead. The old one stays defined; editing or deleting it takes `PATCH` or `DELETE /v1/signals/{signalKey}` on the REST API.
- To change the ICP, go back to step 1 and test a new sample.

## 4. Scale up

Ask before running discovery on more than 100 accounts: the user's go names the size, for example the rest of the pool.

1. Import the pool rows the user approved in batches of 200, collecting ids as in step 2.
2. Start one `trayo_run_discovery` per batch of up to 200 accounts and group of up to 10 signals, alongside each other, with `lookbackDays: 90`, so every company meets every signal. For one run of up to 500 accounts and 50 signals, use `POST /v1/discoveries` on the REST API. Larger runs, and several in flight at once, take longer to settle.
3. Poll every run, then read and rank exactly as in step 3, over all runs together, test included.

For 10,000 companies, do not run it inside one conversation: write a script against the REST API from recipe `exact-prospecting` and recipe `monitor-accounts`.

## Rules the API holds you to

- Every tool error carries `code` and `retry`. `fix_input`: change the arguments. `retry_later`: wait, then repeat the same call. `do_not_retry`: stop; the same call will keep failing.
- `run.error` on a completed run means it did not do everything it was asked; say so to the user instead of hiding it.
- Never re-run the same accounts in a loop hoping for more events.

## Finish

Hand back the ranked companies: the name, how many signals each hit, and for each signal the evidence (`title`, `eventDate`) and its `url`. For a table the user will look at, add each account's `logoUrl` from `trayo_list_accounts`, which lists the most recently created accounts first. Also hand back the ICP filters and signal keys you ran, each signal's fire rate, and the run ids.

By now you must have: had the user approve the ICP before adding any company; shown the test result with every signal's fire rate and waited for a go before scaling; asked before running discovery on more than 100 accounts; read every event page of every run and deduplicated by event `id`.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: `trayo_add_to_list` `{ name, members: [{ accountId, via: 'signal', eventId }] }` for the top companies. Over 200 members takes several calls: send `name` on the first one only, then the `list.id` it answers with as `listId`, or two by-name calls race and split the set across two lists with the same name. The companies and signals stay in the workspace, and when `trayo_whoami` reports `monitoring.enabled: true`, Trayo's standing scan keeps searching them. For the people at the top companies, skill `find-stakeholders`.
- Re-run it on your cadence: recipe `exact-prospecting` for the ICP search and recipe `monitor-accounts` for the signal runs, at `https://api.trayo.ai/v1/recipes`, with the same filters, signal keys and 90-day window.
- Hand it off: a CSV of the ranked companies with each signal's evidence and link, written from the rows you hold.
