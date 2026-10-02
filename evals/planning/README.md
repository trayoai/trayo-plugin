# Planning behavior evaluations

These cases exercise decomposition, equivalent-term expansion, result-driven revision, and cost-aware tool selection. They evaluate tool trajectories and the final answer, separately from tests that check whether a skill is packaged or a playbook is delivered. They are maintainer material, outside the installed skill payload.

## Run against an agent

1. Use a sandboxed model harness with the candidate plugin skills (or their MCP playbook equivalents) and current public tool schemas. Stub all Trayo tools: these cases must not spend real credits, import real accounts, or use customer data. Start a fresh conversation for each case and supply its `prompt` and relevant context from `setup`. Use synthetic records and `.example` domains. Map illustrative run IDs to valid fixture IDs consistently if the harness validates them.
2. Keep `steps` and `review` hidden from the agent. The operator or harness uses `setup` to return responses in the current public schema, with the specified counts, coverage, caps, errors or settlement state. Preserve those responses in the original transcript. These are scenario specifications, not a replacement MCP mock server or an API schema fixture.
3. Record the complete ordered tool trajectory and final answer as JSON: `{"caseId":"company-title-join","calls":[{"tool":"trayo_find_companies","arguments":{...}}],"final":"..."}`. Strip only harness-specific tool-name prefixes; retain every call, including writes, failures, and routing. Do not remove unwanted calls to make a trace pass. Keep raw responses and intermediate messages in a local transcript for review, not this public repository.
4. Run `node evals/planning/grade.mjs /path/to/trace.json`. Exit 1 means a trajectory failed; exit 2 means invalid input. Exit 0 means the deterministic trajectory checks passed and **semantic review is still required**. The grader checks these deliberately constrained paths, not every valid solution; review alternative correct trajectories before changing a case.
5. Review the original transcript against every returned rubric item. Record pass/fail, evidence, model/version, skill commit, schema version, and harness settings. Check qualification, coverage, meaningful query revisions, and whether the supplied results actually caused the observed branch. A plausible final answer or matching tool sequence alone is insufficient.

Case coverage includes a joined company/title query, a joined people/employer query, a month-level job-change search, AND/OR post expansion with an empty sample, a permitted transient retry, unsupported historical coverage, a cap-driven query revision, a pending discovery resumed to settlement, and reuse of paginated events. Unnecessary research, discovery, enrichment and writes fail the expected trajectories. Simple tasks do not require a separate plan or workspace fetch; an optional playbook routing call is allowed and counted.

An optional `elapsedMs` or `creditsUsed` records a measured value for the whole run. Missing values stay `null`, never zero. Compare repeated baseline and candidate runs with the same fixtures and settings; report task success, constraint failures, call counts and measured latency/usage separately. Stubbed wall time and usage do not establish production cost or discovery runtime. The case call counts are evaluation expectations, not customer limits.

## Test the grader

Run `node --test .github/scripts/planning-eval.test.mjs`, or the repository's full `node --test .github/scripts/*.test.mjs` gate. These tests use synthetic passing and deliberately bad traces to check the grader. They do **not** run a model or prove that an agent follows the skill. No model evaluation result is checked in here.
