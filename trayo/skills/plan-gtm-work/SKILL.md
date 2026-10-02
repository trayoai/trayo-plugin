---
name: plan-gtm-work
description: Plan a multi-step Trayo job before choosing search, research, signals, people or enrichment tools. Use when a GTM request needs several capabilities, the user names an outcome without a method, or a first pass needs a different approach. Skip this for a simple lookup or a task with an applicable plan already agreed.
---

# Plan the GTM approach

Use this once per multi-step job. Read-only calls to understand the workspace or inspect existing results can come first. A simple lookup goes straight to its tool. Reuse an existing plan while its goal and constraints still apply; do not restart planning when moving between skills.

## Understand the outcome

1. Read `trayo_whoami` for the workspace, permissions and allowances. Read `trayo_get_workspace` for what the user sells, their ICP and buyer roles. Reuse information already in the conversation and existing accounts, lists, signals or events before searching again. If seller context is missing, research the user's known website with `trayo_research_company`. Ask only for information that remains necessary and cannot be recovered this way.
2. State the deliverable and what qualifies a result: the requested count, company or person criteria, evidence, dates, geography, exclusions and output format. Separate requirements from preferences. If a required condition cannot be verified, flag it and keep those candidates unqualified.
3. State a working hypothesis about why these accounts, people or events matter to what the user sells. Name the evidence that would support or reject it. Company fit, a keyword mention and buying intent are different claims; do not treat one as proof of another. Label inferred seller context or buyer needs as assumptions.

## Choose the approach

Select only the capabilities needed to answer the request. For each stage, name the question it answers and the evidence passed to the next stage.

| Need | Starting point |
| --- | --- |
| Companies matching explicit attributes, or companies similar to examples | Skill `build-account-list`: exact filters or lookalikes, then qualify the candidates. |
| Companies showing a relevant change or buying signal | Skill `find-intent-accounts`; for an already chosen company set, skill `discover-signals`. Explain why the selected signals support the hypothesis. |
| Buyers, champions or evaluators at chosen companies | Skill `find-stakeholders`: define their role in the purchase before searching. |
| Context for a meeting or an account decision | Skill `research-account` or skill `research-person`; research the entity the user named. |
| Contact details for selected people | Skill `enrich-contacts`, after choosing the people and checking the allowance. |
| A Trayo-powered app | Skill `build-app`, using this plan to define its user outcome and data flow. |

Reuse suitable saved results. Search and research do not save records; import accounts, add people, create signals or enrich contacts only when needed for the requested outcome and authorized. Do not add discovery to a request that only needs company attributes, or contact enrichment to a research brief. Follow the current tool contracts and the selected workflow's rules.

## Bound the first pass

Choose an initial scope that fits the request and the available allowance: which accounts or people, which signals, the requested lookback, and how much work to try first. Use the selected workflow's sample and batching rules. State any unknown cost or coverage instead of inventing a budget or success rate.

Decide what the first pass must show and when to continue, revise or stop. Continue toward the requested result within the authorized scope; revise when evidence rejects the hypothesis; stop when the result is complete, the source is exhausted, a real limit is reached, or the work needs additional authorization. An empty or failed search is not proof that no qualifying prospects exist. Preserve required criteria when revising, and follow the workflow's approval rules for scope changes and scaling.

## Execute and assess

Show a brief plan covering **outcome, hypothesis and evidence, approach, initial scope and stop conditions**, then proceed with work already authorized. This planning step adds no approval checkpoint and grants no permission to spend, write, delete or contact anyone. Respect the user's existing authorization and the server's approval rules; do not ask again solely because a new skill was loaded. If the user requested only a plan, deliver the plan and stop.

After the first pass, compare qualified results with the success criteria. Report the evidence, coverage, failures and remaining shortfall. Refine the approach within the agreed constraints when useful; do not repeat identical failed calls or broaden criteria just to fill the requested count. Hand the plan and results forward when continuing into another workflow.
