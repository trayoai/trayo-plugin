---
name: plan-gtm-work
description: Plan a Trayo task that needs several tools or a different search. Match requirements to tools and their inputs. Add equivalent terms without changing the request. Compare cost and time. Use results to choose the next step. For simple lookups or tasks with a suitable plan, continue without this skill.
---

# Plan work with Trayo

Use this skill once for each multi-step job. If an existing plan fits the job, reuse it. For a simple lookup, call the tool directly.

Read-only calls do not save or change records. You can make read-only context calls before planning. If results change what you know, revise only the affected steps.

## Define the result

Use the conversation and the workspace information that the task needs. If the task does not depend on the seller, do not fetch seller information. If access or allowance information is missing, read `trayo_whoami`. If the task needs missing seller, target company, or buyer information, read `trayo_get_workspace`. If required seller information is still missing, use `trayo_research_company` with the known seller website. If required information is still missing, ask the user.

State the requested result and output format. List the requested count, record type, required evidence, dates, locations, and exclusions. Separate requirements from preferences.

Buying intent means interest in making a purchase. If the task seeks buying intent, explain why the accounts or events matter to the seller. State which evidence supports or rejects that explanation. Label assumptions. A matching company profile or a keyword mention does not prove buying intent.

## Choose tools for each requirement

Read current tool definitions before choosing inputs. Filters limit which records a search returns. For each requirement, name the tool, its inputs, the information it needs, and the evidence it must return. If no tool supports a requirement, state this limit. Do not count a result as a match without the required evidence.

Do not invent a filter or replace a requirement with a related fact. For example, a company that sells to hospitals does not necessarily belong to the healthcare industry. A company headquarters address does not establish where a person lives; to filter people by where they live, use `filters.person` on `trayo_find_people`, which matches the location the person states on their LinkedIn profile.

Use the fewest calls that can answer the request. If one tool supports several requirements, combine them in one search. A company search can combine company criteria and a job title. A people search can combine a current role and current employer criteria. Add another step only for a missing requirement or a requested output.

Discovery collects evidence for a chosen group of accounts. Choose the tool or skill that answers each question:

| Question | Tool or skill |
| --- | --- |
| Which companies match stored facts or have someone in a role? | Use `trayo_find_companies` with `mode: "direct"` and `filters`. Omit `query`. Read skill `build-account-list`. |
| Which people have a role at employers that match the criteria? | Use `trayo_find_people` with `mode: "direct"`. Set title and employer filters. With no employer criteria, take `industries` from the workspace profile and, when one of them maps to an accepted value, `headcount` from a saved profile (`max` at most 50,000), or else use `headcount: { min: 1, max: 10000 }`. Read skill `find-stakeholders`. |
| Who started a role recently? | Use `trayo_search_job_changes` with `title`, `startedSince`, and supported `destinationFilters`. |
| Which posts discuss a topic or come from a named author? | Use `trayo_search_posts` with `topic`, an `author` LinkedIn profile URL or handle, or both. Use `publishedFrom` and `publishedTo` together for inclusive dates; they override the relative `windowDays` (at most 30). Dates do not expand stored coverage. Topic matches by meaning and keyword; author-only results are newest first. Posts arrive about 10 days late. Keep exclusions out of `topic` and apply required words and exclusions by reading the posts. |
| Who commented on a LinkedIn post? | Use `trayo_get_post_engagers` with a returned `postId` or post URL. Check `indexed` before interpreting an empty list, and `commentsLoadedAt` for stored-comment freshness. Stored comments can omit replies; `truncated` only covers the 500-row read limit. |
| Which companies resemble known examples or match a search by meaning? | Use `trayo_find_lookalikes` or sentence search from skill `build-account-list`. Keep every requirement. |
| What information is missing for a named company or person? | Use skill `research-account` or skill `research-person`. |
| Which accounts show the requested business events? | If existing events are sufficient, use them. Otherwise, read skill `find-intent-accounts` or skill `discover-signals` for the chosen account group. |
| Which contact details are needed for selected people? | Select the people first. Make sure that enough allowance remains. Read skill `enrich-contacts`. |
| Which tools support the requested app? | Match the app requirements to tools with skill `build-app`. |

Search and research do not add prospect records. Imports, saved people, signal creation, and contact lookups require a need in the task and existing permission. Do not run discovery for a search of stored attributes. Do not add contact lookups to a research brief.

## Add equivalent search terms

Use domains or IDs that you already know are correct. Reuse relevant context. If industry values are needed, use `trayo_list_industries`. CTO means chief technology officer. For job titles, include equivalent spellings such as `title.any: ["cto", "chief technology officer"]`.

OR means that any alternative can match. AND means that all requirements must match.

Preserve companies, people, number limits, dates, locations, and excluded terms. Do not replace a CTO request with every executive role. Do not infer a technology from company size. Do not silently shorten the required time period.

If an assumption changes which results meet the requirements, state it. Follow the selected skill's rules for changes to the agreed work. Use optional context to rank results. Do not turn optional context into a required filter.

## Choose work by cost and time

Choose work that can supply the required evidence. Read-only does not mean free. Use the following differences when choosing tools:

| Work | Cost and time |
| --- | --- |
| Existing results, lists, events, or saved result pages | These avoid repeated work. Make sure that they cover the request. Make sure that they are recent and complete. |
| Direct company, people, or job-change searches | These read stored data without sentence interpretation or external research. Use them when their fields answer the request. Read their data and capacity limits. |
| Searches by meaning, similar companies, or research for a named company or person | Use these when stored filters cannot answer the request. Post evidence comes from `trayo_search_posts`. Read the tool's allowance and timing guidance. A retry can use allowance again. |
| Discovery for a chosen account group | Discovery runs in the background. Use it for supported events that existing results do not cover. If possible, narrow the account group first. Follow the selected skill's rules for samples, run sizes, and permission. |

These choices are not a required sequence. If the known task requires discovery, start with discovery. A rate-limit bucket controls how often calls can run. The bucket name `expensive` does not state a price or completion time.

Do not invent prices, completion times, or success rates. If a cost or time is unknown, state that it is unknown. To size further work, use results from a representative first pass. Label predicted numbers as estimates. Do not present estimates as measured or guaranteed results.

State the starting accounts, people, or other records and the available allowance. State when to continue, change the search, or stop. `waitSeconds` limits how long one discovery response waits. It does not limit the total time that discovery takes.

## Read results before changing the search

After each useful result, compare the matches and evidence with the request. Read the applied or interpreted filters and the dates of the evidence. Make sure that each reported match meets every requirement. If the result includes `coverage`, `notes`, or `next`, read those fields. Read any limits, cutoffs, errors, or page information.

For file results or saved pages, read the full contents before selecting rows. A preview can omit results. A cursor marks where the next result page starts.

| What the result shows | What to do next |
| --- | --- |
| There are matches and another page, but the requested count is not met. | Read the next page with the same filters, sort order, and limits. Remove duplicates. Stop at the requested count. |
| A people search returns too few rows and names a `perCompany` cap. | Make sure that the cap caused the shortfall. If useful and allowed, raise `perCompany` within the tool limit. Restart without the old cursor. Reading another page does not raise this limit. |
| Results do not fit, or equivalent terms are missing. | Explain the problem in the results. Adjust supported filters or add equivalent terms. Keep every requirement. Start the changed search without the old cursor. |
| A requirement has no supporting evidence. | If supported and authorized, get the missing evidence. Otherwise, state which requirement has no supporting evidence. Do not count the result as a match. |
| A limited sample is empty, or the search covers only part of the required data. | State which data the search covered. If you change the search, explain which result supports the change. Do not repeat the same successful empty search. Do not claim that no matches exist elsewhere. |
| A tool returns an error. | Follow the error rules below. |
| A discovery is still running. | Read progress with `trayo_get_discovery` for the same run. Use the offered wait interval. Treat results as unfinished until `settledAt` is set. Do not start a second run because the first response is partial. |

Read `code` and `retry` before handling an error:

- For `fix_input`, correct the input.
- For `retry_later`, wait for the given delay before retrying.
- For `do_not_retry`, stop.

If the retry guidance permits it, repeat the same arguments. Run retries one at a time. An error does not mean zero matches. If errors continue, report the failure instead of looping.

Continue only within the user's existing permission. Stop when the result is complete, the source has no more results, or a limit blocks further work. If further work needs permission, ask before continuing. Do not weaken the requirements to fill a requested count. For each important change, explain what the result showed and why the next call helps.

## Examples

### Companies with a CTO

The user asks for 20 companies with 50–200 employees and a CTO. Use `trayo_find_companies` once with these inputs:

- Set `mode: "direct"`.
- Set `filters: { headcount: { min: 50, max: 200 }, title: { any: ["cto", "chief technology officer"] } }`.
- Set `limit: 20`.

This call returns companies. Do not fetch people for every company. Do not run discovery for this request. If more matching companies are needed, read the next page.

### People at matching employers

The user asks for CTOs at companies with 50–200 employees. Use the previous example's title and headcount filters in `trayo_find_people` with `mode: "direct"`. The tool matches the current role to the current employer. Do not run a separate company search. Before reporting a shortfall, read `perCompany` and any cutoff notes.

### People with a title at any company

The user asks for people with the title Marketing Manager and names no company, industry, city, state or size. This is a filters-only search, so do not ask which companies to search. Read `trayo_get_workspace`. When `buyerProfile.industries` is not empty and `buyerProfileSource` is `saved` or `partial`, map each industry to an exact value from `trayo_list_industries`, and use `trayo_find_people` with these inputs:

- Set `mode: "direct"`.
- Set `filters.industries` to the mapped profile industries and `filters.title` to `{ any: ["marketing manager"] }`.
- Set `filters.headcount` to `buyerProfile.sizeBand` when the profile is `saved`, with `max` lowered to 50,000 if it is higher. Otherwise set it to `{ min: 1, max: 10000 }`.

When no profile industry maps, or there is no profile, set `filters: { headcount: { min: 1, max: 10000 }, title: { any: ["marketing manager"] } }` instead. Skill `find-stakeholders` covers a country-only request and the other cases. Tell the user which company filters you chose, where they came from, and which profile industries did not map, and offer to narrow or widen them. Do not say every company was searched: a direct title search checks at most the first 30 companies in `sort` order, largest first by default, and notes such as `company_fan_out_limit_reached` say when more companies matched.

### People who started a role recently

A CISO is a chief information security officer. The user asks for CISOs who started since September 2026 at US companies with at least 500 employees. Use `trayo_search_job_changes` with these inputs:

- Set `title: { any: ["ciso", "chief information security officer"] }`.
- Set `startedSince: "2026-09"`.
- Set `destinationFilters: { hq: { countries: ["US"] }, headcount: { min: 500 } }`.

This filter uses the month that a role started. It does not use the date when the change was detected. Do not promise an exact start day. Do not research each person to rebuild information that the tool already returns.

### Posts about CRM migrations

CRM means customer relationship management. The user asks for posts about CRM migrations during the past seven days, excluding job ads. Use `trayo_search_posts` with these inputs:

- Set `topic: "moving to a new CRM or migrating CRM data"`.
- Set `windowDays: 7` and `limit: 50`. Posts arrive over about 10 days, so most of the past seven days has not arrived yet: say so, and offer a 30-day search with posts labelled by date if older posts help.

The search has no exclusion filter, and every word in the topic is searched for, so keep "job ads" out of the topic. Drop job ads by reading the posts, and say the exclusion was applied by reading. `text` is cut at 600 characters: a cut post that does not show a required word stays as unconfirmed. Cite the post evidence. A mention does not prove a buying project.

If the request requires 90 days, explain the 30-day limit. Do not silently reduce the period. Do not claim that discovery can retrieve 90 days of these posts.

### Expansion events at target accounts

The user asks for signs that the target accounts are expanding. Use the agreed account group. If existing events are recent enough and cover the question, use them.

If new evidence is needed, follow skill `discover-signals` for that group. If the task also needs an account group, follow skill `find-intent-accounts`. Read the same run until `settledAt` is set. Read all needed event pages. Report accounts only when the evidence meets the request. If the user requested people or contacts, you can add those steps.

### A summary of an existing run

The user asks for a summary of run X. Read `trayo_get_discovery` for X. Read `trayo_list_events` with its `discoveryRunId`. Follow event cursors.

If X is still running, state that the results are not final. Continue the same run until `settledAt` is set. Do not start a new discovery for a summary.

## Use the plan and report the result

Show a short plan before starting the agreed work. Include the following information in the plan:

- Name the result and the evidence that counts as a match.
- Match each requirement to a tool and its inputs.
- State what to search first, the expected effort, and the conditions to continue, change the search, or stop.

Proceed with work that the user already authorized. Keep simple tasks simple. Do not expose a long record of your reasoning.

Planning does not add an approval step. Planning does not grant permission to spend, write, delete, or contact anyone. Follow existing permission rules and the chosen skill's approval rules. Do not ask again only because you loaded another skill. If the user asked only for a plan, return the plan without running the work.

Report the results that meet the request. Include the evidence and which data the tools searched. Report failures and any shortfall. Explain important changes to the searches. If another task follows, carry forward the plan and results.
