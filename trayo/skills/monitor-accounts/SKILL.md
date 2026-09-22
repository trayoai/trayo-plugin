---
name: monitor-accounts
description: Watch named accounts or accounts that match a definition for selected signals. Backfill their recent history and report new events on later checks. Use when the user asks to monitor accounts, keep an eye on companies, or check what changed since the last review.
---

# Monitor accounts for signals

Collection results may use `delivery: "file"`. In that case, `preview` and `metadata` are compact and may be shortened; download `file.downloadUrl` and process the complete JSON in code before selecting or importing rows. If the download is blocked, as in Claude Cowork, read the same result with `trayo_read_result { resultId }` and follow `page.nextCursor` while `page.hasMore` is true; this never repeats the search. Keep the original `hasMore`/`nextCursor` pagination, and do not repeat the search to get its file. Use `output: "file"` when a download is wanted, or `output: "pages"` when you cannot download files.

Trayo provides events through repeated reads. A recurring check needs a schedule in the calling agent or a script.

A settled run with no reported error does not prove that every saved account was searched. Report the events returned and any reported failures. Describe an empty digest as "no new events returned", rather than proof that nothing happened at those accounts. The checkpoint tracks successful reads, not verified scan coverage.

## Set up once

1. Call `trayo_whoami` and read `monitoring`. This reports whether a standing schedule is enabled, but the public tools do not verify current automatic coverage for each saved account. Plan an explicit discovery for the saved list on every scheduled check. Do not promise a scan frequency that Trayo does not report.
2. Call `trayo_get_workspace`. If `stakeholderCriteria` is null, define the roles that matter with `trayo_set_workspace` before discovery. If the user has not described their product or buyers, ask for that context. This definition affects future events and does not attach people to older events.
3. Build the account set:
   - For named accounts, call `trayo_import_accounts` with up to 200 `{ name, url, linkedinHandle }` rows. Use a URL with its scheme and include the LinkedIn company handle when known.
   - For a company definition, call `trayo_find_companies`. Follow `nextCursor` for a filters-only search. A `query` search returns one ranked page. Import the results using each row's `url` and read `droppedUnaddressable` before reporting a count.
   - Collect `created[].id` and every duplicate row's `existingId`. New accounts are assigned to the acting user. Duplicate imports do not change identity or assignment.
   - Ask before the first backfill over more than 100 accounts; later checks re-run the approved set without asking.
4. Save these IDs with `trayo_add_to_list`, using account members and their `via` value. For more than 200 members, send `name` once, then use the returned `list.id` for later batches. Store `list.id` so later checks use the same account set.
5. Create one signal per business event with `trayo_create_signal`. Keep the `signalKeys` for later checks. Use one discovery for all selected signals.

## Backfill and report

1. Record `checkStartedAt` as a full ISO-8601 timestamp before starting the backfill.
2. Call `trayo_run_discovery` with the saved `accountIds`, selected `signalKeys`, `lookbackDays: 90`, and `waitSeconds: 45` — plus `people: "add"` when the user wants the people behind each event (the default adds none). A run started here covers at most 200 accounts and 10 signals, so split the saved accounts into batches of up to 200 and the watched signals into groups of up to 10, and start one run per batch × group pairing, alongside each other, so every account meets every signal. Larger runs, and several in flight at once, take longer to settle; read `progress` and the events as they land rather than waiting on one run before starting the next.
3. While `settled` is false, call `trayo_get_discovery` with its `runId` and `waitSeconds: 45`. The answer carries `progress` and the events written so far, but wait for `settledAt` before reporting counts or reading final results.
4. Read `run.error` and `run.blockedSignals`. Apply the recovery steps below and report failures and blocked accounts.
5. For each settled run, call `trayo_list_events` with these arguments:

   ```json
   { "discoveryRunId": "<run.id>", "expand": "all" }
   ```

   Follow `nextCursor` until `hasMore` is false. Keep `discoveryRunId` and `expand` on every page. This filter returns everything that run wrote, at any `eventDate` — a job change is dated by the month the job STARTED and can predate the lookback — plus the matches on its accounts, signals, and lookback window, including ones from earlier runs. Paged to the end, a settled run therefore yields at least its `eventsNew` events; one page does not, so follow `nextCursor` before comparing to that counter. When the backfill ran as several batch × group runs, an event that matched signals in more than one group comes back under more than one `discoveryRunId`: merge the pages of all runs and deduplicate by event `id` before counting, reporting, saving the digest, or recording delivered IDs.
6. Report `accountName`, `title`, `eventDate`, matched `signalKeys`, and `whyItMatters`. If `whyItMatters` is null, use `summary`. Include people and their `reasoning` when present — only a run started with `people: "add"` attaches them. Without it a `job_change` event still names the person who changed jobs; add them with `trayo_add_people` if the user wants them. Event `people` are already in the workspace: their `id` works directly in `trayo_add_to_list` and `trayo_enrich_emails`, so do not add them again with `trayo_add_people`; every email lookup draws on the workspace's allowance, which skill `enrich-contacts` states before spending. Do not infer an empty result from `eventsNew: 0`.
7. After reading all pages and saving the digest, store the delivered event IDs to remove duplicates between checks. Store `lastCheckedAt = checkStartedAt` only when no reported failures or blocked accounts remain. If a read or digest save fails, keep the previous checkpoint too.

## Every later check

1. Load the saved list with `trayo_get_list_members`, using `listId` and `kind: "account"`. If needed, find the saved list through `trayo_list_lists`. Read every member page before collecting the account IDs. Keep `listId` and `kind` on every page.
2. Record a new `checkStartedAt` before discovery or event reads. Keep the previous `lastCheckedAt` unchanged during this check.
3. Run discovery for every saved account and all watched signals, even when `monitoring.enabled` is true. Account assignments can change after setup, so neither an earlier import nor a successful backfill confirms current automatic coverage. Apply the backfill batching (one run per batch × group pairing) and recovery rules, and wait for every run to settle before the digest. Include reported failures and blocked accounts in the digest.
4. For each saved account ID, call `trayo_list_events` with these arguments:

   ```json
   { "accountId": "<saved account ID>", "signalKeys": ["<watched signal key>"], "discoveredSince": "<lastCheckedAt>", "expand": "all" }
   ```

   Send every watched signal key in `signalKeys`. Follow every `nextCursor` with the same `accountId`, `signalKeys`, `discoveredSince`, and `expand`.
   Do not reuse a backfill `discoveryRunId` here because its time window excludes later events.
   `discoveredSince` selects when Trayo found an event. `since` selects when the event happened and can exclude newly found older news.
   Use a full ISO-8601 timestamp. Relative dates such as `yesterday` are invalid. The default event state is live.
5. Remove event IDs already delivered and save the digest. Advance `lastCheckedAt` to `checkStartedAt` only after reported discovery failures are resolved, every account page is read, and the digest is saved. If any account still reports an error or blocked signal, or any read or save fails, retain the previous checkpoint. The timestamp boundary is inclusive, so keep delivered IDs to avoid repeated entries.
6. For a REST script, use the same account scope on every page: `GET /v1/events?accountId=…&signalKeys=…&discoveredSince=…&expand=all`.

## Recover failed or blocked runs

If a settled batch has more than one account and `run.error` is not null, retry each requested account in a separate discovery with the same signals and lookback window. Do this once. Individual runs identify accounts that still report an error, even when the batch reports only a count or another error replaces its coverage warning. If a single-account run still reports an error, stop retrying it and report the account and reason. For an unassigned account, ask a workspace admin to assign it in Trayo. Keep the previous checkpoint while any account still reports an error or blocked signal.

These recovery steps apply to every signal type, including `news`. While a run is active, keep polling it.

- For `account_not_ready`, wait for the run to settle, then retry the affected account IDs.
- For `company_not_found`, check the account identity. Use `PATCH /v1/accounts/{id}` with the correct `linkedinHandle`, or a corrected website `url` when no handle is known. This REST call requires a workspace API key with `accounts:write`. Importing the same hostname again skips the existing account and does not repair it. If you only have MCP OAuth access, ask a workspace admin for the REST repair. After the update, start a new discovery for the affected IDs.
- If an identical MCP call returns the old run, wait for its five-minute deduplication window to expire.

## Scale an approved event preview

To expand an approved preview, keep the filters that produced it. For a backfill, keep its settled `discoveryRunId`. For a later check, keep `accountId`, `signalKeys`, `discoveredSince`, and the selected event state. Call `trayo_list_events` with `limit: 1000`, `output: "file"` (or `"pages"` when downloads are blocked), `expand: "people,signals"`, and no cursor. The total counts events including preview matches, with existing stakeholders nested. Download `file.downloadUrl` in code; check actual `rowCount`, `collection.stopReason` (file/inline) or first-page `metadata.collection.stopReason` (pages), and `hasMore`. Continue with `nextCursor` and the remaining count if needed. This reads existing events and attached people; it does not run discovery or find missing stakeholders.

## Finish

Hand back the digest: `accountName`, `title`, `eventDate`, matched `signalKeys` and `whyItMatters` (or `summary`) per event, people with their `reasoning` when present, then the reported failures and blocked accounts. An empty digest is "no new events returned", not proof that nothing happened.

By now you must have: asked before the first backfill over more than 100 accounts; waited for every run to settle; read every event page; advanced `lastCheckedAt` only after failures were resolved and the digest was saved.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: the saved list and signals are already the standing setup — `trayo_list_lists` finds the list again, and when `trayo_whoami` reports `monitoring.enabled: true`, Trayo's own standing scan keeps searching the workspace's accounts between your checks.
- Re-run it on your cadence: recipe `monitor-accounts` at `https://api.trayo.ai/v1/recipes`, with the `/v1/events` read from the later-check step in a script the user schedules.
- Hand it off: the digest written to a file the user names, or a CSV of the events.
