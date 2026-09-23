---
name: discover-signals
description: Track a list of companies in Trayo and read what happens at them — import accounts, define a signal, run a discovery, wait for it, read the events. Use when the user has company names or websites and wants news, hiring or job-change events for them, or asks to "run discovery", "find signals", "monitor these accounts" or "what happened at these companies".
---

# Track companies and read what happens at them

Collection results may use `delivery: "file"`. In that case, `preview` and `metadata` are compact and may be shortened; download `file.downloadUrl` and process the complete JSON in code before selecting or importing rows. If the download is blocked, as in Claude Cowork, read the same result with `trayo_read_result { resultId }` and follow `page.nextCursor` while `page.hasMore` is true; this never repeats the search. Keep the original `hasMore`/`nextCursor` pagination, and do not repeat the search to get its file. Use `output: "file"` when a download is wanted, or `output: "pages"` when you cannot download files.

The core Trayo loop, with the `trayo_*` tools.

When the user wants the companies that show intent for their own company, rather than events at companies they named, use skill `find-intent-accounts`: it agrees on the ICP and tests a sample before anything scales.

## Before anything

1. Call `trayo_whoami` once. It tells you the workspace you act in and whether metered work may start (`canInitiate`). Plan against what it says.

## The loop

1. **Import the companies** with `trayo_import_accounts`: up to 200 rows of `{ name, url }` (the url needs its scheme, `https://…`), `linkedinHandle` optional. Read `created[].id` — those are the `accountIds` you need. Rows in `skipped` were duplicates or carried fields the route does not accept; either is fine, not a failure, and the rest of the batch still lands. A skip with `reasonCode: "duplicate"` carries `existingId`, the account that was already there — use it as an `accountId` beside the created ones instead of dropping the company. A row missing `name`, or with a scheme-less `url`, is not skipped: it fails the whole call and creates nothing, so fix that row and re-send. Re-importing a list is safe.
2. Call `trayo_create_signal` with a new lowercase `signalKey` (3–60 characters), a `type`, and `detects` in plain prose. Use `news` for web events, `jobs` for hiring, or `job_change` for people starting roles. Continue with the returned key. You can use a new signal key immediately.
3. **Before starting**, tell the user in one line how many accounts, which signals, and what lookback the run will cover, and wait for their go when it is more than 100 accounts. **Run the discovery** with `trayo_run_discovery` `{ accountIds, signalKeys, lookbackDays: 30, waitSeconds: 45 }`. It waits up to 45 s. A run started here covers at most 200 accounts and 10 signals; `lookbackDays` is 30 unless you ask for more, up to 365. That is the limit per run, not per workspace: to cover more, split the accounts into batches of up to 200 and the signals into groups of up to 10, and start one `trayo_run_discovery` call per batch × group pairing, alongside each other, so every account meets every signal — or start one run of up to 500 accounts and 50 signals with `POST /v1/discoveries` on the REST API. Larger runs, and several in flight at once, take longer to settle: poll each with `trayo_get_discovery` and read `progress` and the events as they land rather than waiting on one run before starting the next. Omitting `signalKeys` runs every signal in the workspace and is refused with `discovery_run_too_large` when the workspace holds more than 10 — list the keys you want, in groups of up to 10. A run adds no people to the workspace by default: events come back with `people: []`. A `job_change` event still names the person who changed jobs; add them with `trayo_add_people` if the user wants them. Pass `people: "add"` only when the user wants the people who matter to each event added and listed on it; otherwise they choose people later with `trayo_find_people`, then `trayo_add_people`.
   - `settled: true` → done. `run.eventsFound` and `run.eventsNew` are this execution's receipt; `events` holds the first page standing for the run: everything it wrote, whatever the `eventDate` — a job change is dated by the month the job STARTED and can predate the lookback — plus the matches on its account × signal × lookback scope, including ones an earlier run wrote. It is the FIRST 25 only, never a total: a run that wrote more does not fit, so page the rest with `trayo_list_events` `{ discoveryRunId }` before comparing anything to `eventsNew`. If it is `null`, read the same scope with `trayo_list_events` as `next` says.
   - `settled: false` → the answer still carries `progress` (accounts finished so far) and `events` (everything the run has written so far — each poll shows more), and `trayo_list_events` `{ discoveryRunId }` reads the rest at any time. Call `trayo_get_discovery` `{ runId: run.id, waitSeconds: 45 }` and repeat until `settled`. Never poll faster than the wait the tool offers, and never conclude anything from counts before `settledAt` is set — a preview is partial by definition.
4. **Read the events** with `trayo_list_events` `{ discoveryRunId }` for the rest of that run's scope, or without the filter for the whole workspace. Follow `nextCursor` while `hasMore` is true. When the work ran as several batch × group runs, an event that matched signals in more than one group comes back under more than one `discoveryRunId`: merge the runs' pages and deduplicate by event `id` before counting or reporting.

## Rules the API holds you to

- Every tool error carries `code` and `retry`. `fix_input`: change the arguments. `retry_later`: wait, then repeat the same call. `do_not_retry`: stop; the same call will keep failing.
- `eventsNew: 0` on a second run over the same accounts is success: results deduplicate against the workspace, while the scoped `events` page still returns matching events already there. Going the other way, a settled run's page is never shorter than its `eventsNew` unless an event has since been withdrawn or deleted — everything the run wrote is readable under its `discoveryRunId`.
- `run.error` on a completed run means it did not do everything it was asked; say so to the user instead of hiding it.
- Read `run.blockedSignals` before reporting an empty result. While a run is active, keep polling the same run. For `account_not_ready`, retry the affected IDs after the run settles. For `company_not_found`, repair the stored identity with `PATCH /v1/accounts/{id}` before another discovery. Send the correct `linkedinHandle`, or a corrected `url` when no handle is known. Use a workspace API key with `accounts:write`. Importing the same hostname again does not update the existing account. If you only have MCP OAuth access, ask a workspace admin for the REST repair. If an identical call returns the old run, wait for its five-minute deduplication window to expire.
- Ask before running discovery on more than 100 accounts, and never re-run the same accounts in a loop hoping for more.

## Scale an approved event preview

For “now give me 1,000,” call `trayo_list_events` with the approved account, signal, date, state and settled `discoveryRunId` filters, `limit: 1000`, `output: "file"` (or `"pages"` when downloads are blocked), `expand: "people,signals"`, and no cursor. The total counts events including preview matches, with existing stakeholders nested. Download `file.downloadUrl` in code; check actual `rowCount`, `collection.stopReason` (file/inline) or first-page `metadata.collection.stopReason` (pages), and `hasMore`. Continue with `nextCursor` and the remaining count if needed. This reads existing events and attached people; it does not run discovery or find missing stakeholders.

## Finish

Hand back the companies imported (and skipped), the signal used, the run id, `eventsNew`, and the event titles with the account names you imported — events carry `accountId`, not names, so map each one back to the row you sent. Event `people` (empty unless the run used `people: "add"`) are already in the workspace: their `id` works directly in `trayo_add_to_list` and `trayo_enrich_emails`, so do not add them again with `trayo_add_people`; every email lookup draws on the workspace's allowance, which skill `enrich-contacts` states before spending.

By now you must have: read the run's event pages to the end, not only the first 25; asked before running discovery on more than 100 accounts; read `run.error` and `run.blockedSignals` before reporting an empty result.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: `trayo_add_to_list` `{ name, members: [{ accountId, via: 'signal', eventId }] }` for the accounts that fired. The signal stays defined, and when `trayo_whoami` reports `monitoring.enabled: true`, Trayo's own standing scan keeps searching the workspace's accounts.
- Re-run it on your cadence: recipe `monitor-accounts` at `https://api.trayo.ai/v1/recipes`, with `POST /v1/discoveries` for one run over more than 200 accounts or 10 signals.
- Hand it off: a CSV of the events with their account names, written from the rows you hold.
