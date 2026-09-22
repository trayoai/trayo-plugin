---
name: onboard-workspace
description: Configure a brand-new, empty Trayo workspace end to end — a stakeholder definition, a starter account cohort, and a first signal — so discovery has something to run on. Use when a workspace has no stakeholder definition and no accounts or signals yet, or the user asks to "onboard this workspace", "set this up", "configure a new workspace", or describes their ICP for the first time.
---

# Onboard a new workspace

This is the API-only replacement for the setup the Trayo app runs automatically when a
workspace is created there. A workspace created through this API starts with none of it —
no stakeholder definition, no accounts, no signals — and stays that way until something
writes it.

## Step 0 — check this isn't already done

Never run this flow blind. Call both:

1. `trayo_get_workspace` (free, read-only) — read `stakeholderCriteria` and `solutions`.
2. `trayo_list_accounts` and `trayo_list_signals` — read whether either is non-empty.

If **any** of those four are already set, stop and tell the user what you found instead of
silently reconfiguring a live workspace: name the fields/counts that already exist and ask
whether they want you to proceed anyway (and if so, whether to overwrite the stakeholder
definition or just add more accounts/signals on top). Treat a workspace with any of these
already populated as already onboarded — this flow is for the empty case.

## Step 1 — set the stakeholder definition

Ask the user for two things in prose, the way you'd brief a new researcher, if they haven't
already given them: what they sell, and who buys, owns, or influences the decision (and who
to skip). Call `trayo_set_workspace` with `solutions`, `solutionsBrief`, and
`stakeholderCriteria`.

**Call this before anything else below.** It is not retroactive: an event produced before
it is set stays people-less, even after you set it later.

## Step 2 — curate a starter account cohort

Ask for a target count if the user didn't give one; Trayo's own default onboarding cohort is
40 accounts (60 for enterprise plans), so use 40 if they have no preference.

Not every account you add will produce an event in the lookback window, so search for more
than the target — about 2x is a reasonable margin — the same way `build-account-list` does:
turn the ICP into a `trayo_find_companies` call (`industries`, `headcount`, `hq`,
`fundingStages`, `technologies` etc. in `filters`; the rest of the description in `query`;
`trayo_list_industries` if you're unsure of exact industry wording).

Import the **entire** over-searched set with `trayo_import_accounts` (batches of 200, `{
name, url }` per row, `url` needs its `https://` scheme). Read `created[].id` — that list is
in creation order, which the pad step below depends on. Keep `existingId` from any
`reasonCode: "duplicate"` skip too; treat it the same as a created account. Importing adds
accounts only, never people: people arrive attached to the events of a discovery run started
with `people: "add"`, or when you add them yourself (skill `find-stakeholders`).

## Step 3 — define at least one signal

Call `trayo_create_signal` with a lowercase `signalKey`, a `type` (`news`, `jobs`, or
`job_change`), and `detects` in prose. Ask the user what they want tracked; offer `news` as a
sensible default if they don't have a strong opinion.

## Step 4 — run discovery, then pad to target

Run `trayo_run_discovery` on the full imported set with the new signal(s),
`lookbackDays: 30`, `waitSeconds: 45`, and `people: "add"` so the stakeholder definition from
Step 1 attaches people to the events (the default adds none). At most 200 accounts and 10 signals per call — split into
batches of up to 200 accounts (and groups of up to 10 signals, one run per batch × group
pairing) and start them alongside each other, polling each with `trayo_get_discovery` and the
same `runId`, same as `discover-signals`. Larger runs, and several in flight at once, take
longer to settle.

Once every batch has settled, merge the runs' event pages and deduplicate by event `id` (an
event matching signals in more than one group comes back under more than one run), then
split the imported accounts into event-bearing (appear in the merged `events` /
`trayo_list_events` results) and zero-event, in the creation order from Step
2. Keep every event-bearing account. If that's under the target count, top it up with the
earliest zero-event accounts until you reach the target (or run out).

**This differs from the app's own onboarding in one way worth saying out loud:** the app
soft-deletes the zero-event accounts beyond the target; there's no equivalent deactivation
tool here, so any surplus zero-event accounts from the over-search stay in the workspace.
Report them separately from the curated cohort and let the user decide whether to remove any.

## Rules

- Never skip Step 0. A workspace that already has a stakeholder definition, accounts, or
  signals is not this flow's job.
- Every tool error carries `code` and `retry`: `fix_input` (change the arguments),
  `retry_later` (wait, then repeat), `do_not_retry` (stop).
- Ask before running discovery on more than 100 accounts total, and don't re-run the same
  accounts hoping for a different result — `eventsNew: 0` on a repeat is expected, not a
  failure.
- `run.error` on a settled run means it didn't do everything asked; say so instead of hiding
  it, and check `run.blockedSignals` before reporting an empty cohort.

## Finish

Hand back the stakeholder definition and solutions you set, the account cohort (target vs. event-bearing vs. padded, plus any surplus left over from the over-search), the signal(s) created, and the discovery run id(s) with `eventsNew`.

By now you must have: run Step 0 and stopped on an already-configured workspace; asked before running discovery on more than 100 accounts total; reported the surplus zero-event accounts separately and left their removal to the user.

Offer these in one line, then wait for the user's pick:
- Keep it in Trayo: everything above is already saved — `trayo_list_events` reads what discovery found, and `trayo_search_stakeholders` then `trayo_add_people` fill in people at accounts that still show `people: []`. When `trayo_whoami` reports `monitoring.enabled: true`, Trayo's own standing scan keeps searching the workspace's accounts.
- Re-run it on your cadence: recipe `start-here` at `https://api.trayo.ai/v1/recipes` for a scripted setup of the next workspace.
- Hand it off: a summary of the setup written to a file the user names.
