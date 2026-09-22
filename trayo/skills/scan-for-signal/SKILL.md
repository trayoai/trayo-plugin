---
name: scan-for-signal
description: Scan a list of accounts for ONE signal — a defined business event such as a new security leader, an office opening, funding — and return only the accounts that fired it. Use when the user asks "which of these companies…", "who hired a new CISO", "scan these accounts for…".
---

# Scan accounts for one signal

Collection results may use `delivery: "file"`. In that case, `preview` and `metadata` are compact and may be shortened; download `file.downloadUrl` and process the complete JSON in code before selecting or importing rows. If the download is blocked, as in Claude Cowork, read the same result with `trayo_read_result { resultId }` and follow `page.nextCursor` while `page.hasMore` is true; this never repeats the search. Keep the original `hasMore`/`nextCursor` pagination, and do not repeat the search to get its file. Use `output: "file"` when a download is wanted, or `output: "pages"` when you cannot download files.

1. `trayo_whoami` once.
2. Make sure the accounts are in the workspace: `trayo_import_accounts` for any that are not (`{ name, url }`, the `url` with its scheme, up to 200 per call); collect the `accountIds` from `created[].id`, plus `existingId` from every `skipped` row with `reasonCode: "duplicate"` — those companies were already in the workspace and must still be scanned.
3. Define the signal with `trayo_create_signal`: a lowercase `signalKey` (`_` or `-` separators, 3–60 characters), `type: news`, `detects` in plain prose. Continue with the returned key immediately.
4. Ask before running discovery on more than 100 accounts — the 200-account cap below is the tool's limit, not the user's approval. Then run `trayo_run_discovery` `{ accountIds, signalKeys: [signalKey], lookbackDays, waitSeconds: 45 }` (add `people: "add"` if the user wants the people behind each event; the default adds none); while `settled` is false, `trayo_get_discovery` `{ runId, waitSeconds: 45 }`. A run is final only when `settledAt` is set. A run started here covers at most 200 accounts and 10 signals, and `lookbackDays` is 30 unless you ask for more (up to 365). That is the limit per run, not per workspace: split larger scans into batches of up to 200 accounts with the same `signalKeys` and `lookbackDays` and start them alongside each other, or start one run of up to 500 accounts with `POST /v1/discoveries` on the REST API. Larger runs, and several in flight at once, take longer to settle. While `settled` is false the answer carries `progress` and everything the run has written so far, and `trayo_list_events` `{ discoveryRunId }` reads them at any time; each poll shows more. `lookbackDays` also sets how hard the search digs, so a long window over many accounts is not a fast call.
5. Read every event with `trayo_list_events` `{ discoveryRunId }`, following `nextCursor` until `hasMore` is false — one page is capped, so the full read is the only total. Those pages hold everything the run wrote, whatever the `eventDate` — a job change is dated by the month the job STARTED and can predate the lookback — plus the matches earlier runs left for the same accounts, signals and window. The accounts that fired are the distinct `accountId`s on the events whose `signalKeys` contains your key; each event names its account in `accountName`, so you never map an id back yourself. Reading `signalKeys` rather than trusting the run is what lets this scale: a run over several signals is attributable event by event, so scanning for more than one signal is one run, not one run each.
6. Event `people` (empty unless the run used `people: "add"`) are already in the workspace: their `id` works directly in `trayo_add_to_list` and `trayo_enrich_emails`, so do not add them again with `trayo_add_people`. Every email lookup draws on the workspace's allowance; skill `enrich-contacts` states what is left before spending it.

Follow `retry` on every error. Read the scoped events even when `eventsNew` is zero because previous runs can already hold matching events. Read `run.error` and `run.blockedSignals` before reporting an empty result.

These recovery steps apply to every signal type, including `news`. While a run is active, keep polling it. For `account_not_ready`, retry the affected IDs after the run settles. For `company_not_found`, use `PATCH /v1/accounts/{id}` to repair the stored identity before another discovery. Send the correct `linkedinHandle`, or a corrected `url` when no handle is known. Use a workspace API key with `accounts:write`. Importing the same hostname again does not update the existing account. If you only have MCP OAuth access, ask a workspace admin for the REST repair. If an identical call returns the old run, wait for its five-minute deduplication window to expire.

## Scale an approved event preview

For “now give me 1,000,” call `trayo_list_events` with the approved account, signal, date, state and settled `discoveryRunId` filters, `limit: 1000`, `output: "file"` (or `"pages"` when downloads are blocked), `expand: "people,signals"`, and no cursor. The total counts events including preview matches, with existing stakeholders nested. Download `file.downloadUrl` in code; check actual `rowCount`, `collection.stopReason` (file/inline) or first-page `metadata.collection.stopReason` (pages), and `hasMore`. Continue with `nextCursor` and the remaining count if needed. This reads existing events and attached people; it does not run discovery or find missing stakeholders.

## Finish

Hand back the accounts that fired, each with the event `title` and `eventDate`, and the accounts that did not. Say what `run.error` and `run.blockedSignals` held before calling any silence real.

By now you must have: read every event page, not only the run's first one; asked before running discovery on more than 100 accounts.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: `trayo_add_to_list` `{ name, members: [{ accountId, via: 'signal', eventId }] }` for the fired accounts, read back later with `trayo_list_lists` then `trayo_get_list_members`. Over 200 members takes several calls: send `name` on the first one only, then the `list.id` it answers with as `listId`, or two by-name calls race and split the set across two lists with the same name. The signal stays defined, and when `trayo_whoami` reports `monitoring.enabled: true`, Trayo's own standing scan keeps searching the workspace's accounts.
- Re-run it on your cadence: recipe `monitor-accounts` at `https://api.trayo.ai/v1/recipes`, with `POST /v1/discoveries` for one run over more than 200 accounts.
- Hand it off: a CSV of the fired accounts, written from the rows you hold.
