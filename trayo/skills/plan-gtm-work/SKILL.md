---
name: plan-gtm-work
description: Plan a multi-step Trayo job by decomposing the request into supported primitives, augmenting queries without changing their meaning, choosing work with appropriate cost and latency, and revising from observed results. Use for an outcome that needs several capabilities or a first pass that needs a different approach. Skip a simple lookup or reuse an applicable plan already agreed.
---

# Plan the GTM approach

Use this once per multi-step job. Read-only context calls can come first. A simple lookup goes straight to its tool. Reuse an applicable plan across workflows; revise only the affected part when results change what is known.

## Define the outcome

Reuse the conversation and relevant workspace context. When missing, read `trayo_whoami` for access and allowances, and `trayo_get_workspace` for the seller, ICP and buyer roles. Research the seller's known website with `trayo_research_company` only if needed. Ask only for necessary information that cannot be recovered. Do not fetch seller context for a task that does not depend on it.

State the deliverable, requested count, entity type, qualifying evidence, dates, geography, exclusions and output format. Separate requirements from preferences. For intent work, state why the accounts or events could matter to the seller and what evidence would support or reject that hypothesis. Label assumptions. Company fit, a keyword mention and buying intent are different claims.

## Decompose into supported primitives

For each requirement, identify **the tool and arguments that can check it, the input it depends on, and the evidence needed to qualify a result**. Keep unsupported conditions explicit and their candidates unqualified. Consult current tool schemas; never invent a filter or substitute a related attribute. For example, selling to hospitals is not the same as having a healthcare industry label, and employer HQ is not a person's residence.

Use the smallest sufficient set of calls. Decomposition does not mean one call per condition: combine compatible requirements in a tool that supports them. A company-and-title query or a people-and-employer query can use one direct search. Add a stage only for an unresolved requirement or requested output.

| Question to answer | Primitive and workflow |
| --- | --- |
| Which companies match stored attributes or have someone in a role? | `trayo_find_companies`, `mode: "direct"`, `filters`, no `query`; skill `build-account-list`. |
| Which people have a role at employers matching criteria? | `trayo_find_people`, `mode: "direct"`, title plus employer filters; skill `find-stakeholders`. |
| Who started a role recently? | `trayo_search_job_changes` with `title`, `startedSince` and supported `destinationFilters`. |
| Which recent posts contain required concepts? | `trayo_search_posts_by_keywords` with AND groups of OR alternatives; inspect its bounded coverage. |
| Which companies resemble known examples, or need semantic ranking? | `trayo_find_lookalikes` or sentence search as covered by skill `build-account-list`; retain every required condition. |
| What context or evidence is missing for a named entity? | Targeted research; skill `research-account` or skill `research-person`. |
| Which accounts have the requested signals? | Relevant existing events first if adequate; otherwise skill `find-intent-accounts`, or skill `discover-signals` for a chosen cohort. |
| Which contact details are needed for selected people? | Skill `enrich-contacts`, after selection and an allowance check. |
| What data flow supports the requested app? | Skill `build-app`, using the same requirement-to-primitive mapping. |

Search and research do not save records. Import accounts, add people, create signals or enrich contacts only when needed for the requested outcome and authorized. Do not add discovery to an attribute search, or enrichment to a research brief.

## Augment without changing the question

Resolve identities from verified domains or IDs and reuse relevant context. Use `trayo_list_industries` for accepted industry values when needed. Expand equivalent title spellings, such as `title.any: ["cto", "chief technology officer"]`. In post search, put synonyms for one concept in the same group; independent required concepts stay in separate groups. Respect the tool's term limits.

Keep alternatives OR and requirements AND. Preserve entities, numeric bounds, dates, geography and exclusions. Do not widen a CTO request to every executive, infer a technology from company size, or silently shorten a lookback. If an assumption changes who qualifies, state it and follow the workflow's rules for changing scope. Optional context may guide ranking; it must not become an invented hard filter.

## Choose effort to match the evidence

| Work | Cost and latency considerations |
| --- | --- |
| Reuse adequate results; read lists, events or saved result pages | Avoids repeating work. Check scope, freshness and completeness before relying on it. |
| Bounded direct company/people, job-change or keyword queries | Reads stored data without sentence interpretation or external research. Usually the simpler first step when those fields answer the question; source coverage and capacity still limit it. |
| Semantic search, lookalikes or targeted research | Use when stored filters cannot answer the question. Read the tool's allowance and timing guidance; read-only does not mean free, and a retry can consume allowance again. |
| Discovery on a selected cohort | Asynchronous evidence collection. Use when the task needs supported signals absent from adequate existing results. Narrow the cohort first when possible and follow the workflow's sample, batching and authorization rules. |

This is a choice of sufficient evidence, not a mandatory sequence: go directly to discovery when the known task requires it. A rate-limit bucket named `expensive` is not a monetary price or a runtime estimate. Do not invent costs, completion times or success rates. State unknowns; size further work from a representative first pass and label extrapolations as estimates.

Choose the initial scope, available allowance and conditions to continue, revise or stop. `waitSeconds` is one discovery response's wait window, not its total runtime. Continue an existing run with `trayo_get_discovery`; do not start a duplicate because the first response is partial. Final discovery conclusions require `settledAt`.

## Inspect, revise, stop

After each meaningful result, compare the qualified count and evidence with the request. Inspect applied or interpreted filters, relevance, freshness, missing requirements, `coverage`, `notes`, `next`, caps, truncation, errors and pagination when provided. Read complete file or saved-result pages before selecting rows; a preview is not the whole result.

| Observation | Next action |
| --- | --- |
| Qualifying results with a next cursor, below the requested count | Page the same query with unchanged filters, sort and caps; deduplicate and stop at the count. |
| Thin people result with a `perCompany` cap note | Decide whether the cap caused the shortfall. If useful and allowed, raise it within the tool limit and restart without the old cursor. Paging alone cannot lift the cap. |
| Poor relevance or missing equivalent terminology | Explain the observed problem; refine supported filters or add equivalent terms while preserving every requirement. A changed query starts without the old cursor. |
| A requirement remains unverified | Get targeted supporting evidence if supported and authorized, or report it as unverified. Do not label the candidate qualified. |
| Empty bounded sample or incomplete coverage | Report the coverage limit. Revise only with a reason; do not repeat the same successful empty query or claim universal absence. |
| Error | Follow `code` and `retry`: correct input for `fix_input`, delay a sequential retry for `retry_later`, stop for `do_not_retry`. A transient retry may repeat the same arguments; an error is not zero matches. Report persistent failure instead of looping. |
| Discovery is still running | Read progress and poll the same run at the offered wait interval. Keep interim counts provisional until `settledAt`. |

Continue within authorized scope until the result is complete, the source is exhausted, a real limit is reached, or further work needs authorization. Do not relax criteria to fill a count. Explain material revisions in one line: what the result showed and why the next call addresses it.

## Worked examples

- **“Find 20 companies with 50–200 employees and a CTO.”** One `trayo_find_companies` call with `mode: "direct"`, `filters: { headcount: { min: 50, max: 200 }, title: { any: ["cto", "chief technology officer"] } }` and `limit: 20`. It returns companies, so do not fetch every company's people or run discovery. Page only if needed.
- **“Find CTOs at companies with 50–200 employees.”** Use those title and headcount filters in `trayo_find_people` with `mode: "direct"`. It joins the current role to the current employer; a separate company search is unnecessary. Inspect `perCompany` and truncation before treating a thin result as a shortage.
- **“Find CISOs who started since September 2026 at US companies with 500+ employees.”** Use `trayo_search_job_changes` with `title: { any: ["ciso", "chief information security officer"] }`, `startedSince: "2026-09"`, and `destinationFilters: { hq: { countries: ["US"] }, headcount: { min: 500 } }`. This is a month-level start-date filter, not a detected-date filter; do not promise day-level precision or research each person to reconstruct it.
- **“Find posts about CRM migrations in the last seven days, excluding job ads.”** Use `trayo_search_posts_by_keywords` with `concepts: [["CRM", "customer relationship management"], ["migration", "migrations", "migrating"]]`, `windowDays: 7` and appropriate `excludedPhrases` for the requested exclusion. Inspect `applied`, examine results for job ads that phrase exclusions missed, and cite evidence. A mention does not prove a buying project. If the request instead requires 90 days, explain that this tool supports at most seven days; do not quietly shorten the period or claim discovery retrieves 90 days of these posts.
- **“Find expansion signals at my target accounts.”** Reuse the relevant account scope and sufficiently fresh existing events. If new supported evidence is needed, follow skill `discover-signals` for the chosen cohort, or skill `find-intent-accounts` if finding the cohort is part of the task. Poll the same run until settled, read all needed event pages, then qualify accounts from the evidence. Add people or contacts only if requested.
- **“Summarize the results of run X.”** Read `trayo_get_discovery` for X and `trayo_list_events` with its `discoveryRunId`, following event cursors. If X is still running, say the results are provisional and continue it. Do not start a new discovery to obtain a summary.

## Execute and hand off

Show a brief plan covering **outcome and evidence, requirement-to-primitive mapping, initial scope and effort, and revision/stop conditions**, then proceed with work already authorized. Keep simple work simple; do not expose a long reasoning transcript. Planning adds no approval checkpoint and grants no permission to spend, write, delete or contact anyone. Respect existing authorization and the selected workflow's approval rules; do not ask again solely because a new skill was loaded. If the user requested only a plan, deliver it and stop.

Report qualified results, supporting evidence, coverage, failures, remaining shortfall and material query revisions. Hand the plan and results forward when continuing another workflow.
