# Test an agent's planning

These cases test how an agent chooses tools and changes searches after reading results. They also test whether the final answer uses the evidence. These files are for maintainers and are not part of the installed skill.

A trace records tool calls in order. The grader compares a trace with the calls that a case expects. A passing trace still needs a person to review the results and final answer.

## Run the cases

Use an isolated test environment with the proposed skills or their MCP playbooks. Use the current public tool definitions. Replace every Trayo tool with a stub, which returns a prepared response. Do not spend real credits, import real accounts, or use customer data. Use invented records and `.example` domains.

The cases describe test situations. They do not provide an MCP test server or complete example responses. The person running the test must supply responses in the current public format. A transcript records the conversation and tool responses.

Run each case in a new conversation:

1. Give the agent the case's `prompt` and relevant context from `setup`.
2. Keep `steps` and `review` hidden from the agent.
3. Use `setup` to return the specified counts, limits, errors, or discovery state in the current public response format.
4. If the environment requires valid run IDs, map the example IDs to valid test IDs throughout the case.
5. Save the full conversation, tool responses, and intermediate messages in a local transcript.
6. Record all tool calls and the final answer in a JSON file.

Use this trace format:

```json
{"caseId":"company-title-join","calls":[{"tool":"trayo_find_companies","arguments":{...}}],"final":"..."}
```

Remove only tool-name prefixes that the test environment adds. Keep every call, including writes, errors, and playbook reads. Do not remove unwanted calls to make the trace pass. Keep the transcript outside this public repository.

Run `node evals/planning/grade.mjs /path/to/trace.json`. The command reports one of these exit codes:

- Exit 1 means that the recorded calls did not match the case.
- Exit 2 means that the input was invalid.
- Exit 0 means that the recorded calls matched, but the results and final answer still need review.

The grader tests specific expected calls. Other sequences can also be correct. Before changing a case, review any alternative sequence that answers the request correctly.

Review the saved transcript against every item that the grader returns. Record pass or fail and the evidence for each item. Make sure that the results meet the request and state the limits of the searched data. Make sure that each search change follows from a tool result. Matching calls or a plausible final answer alone do not prove that the agent used the results.

A commit identifies a saved Git revision. Record the model and version, skill commit, tool definition version, and test environment configuration. Keep the original tool responses with the review. These details are needed to repeat the test and compare results.

## What the cases cover

The cases cover company searches that include a job title and people searches that include employer criteria. They also cover role start months and post searches with required ideas, synonyms, and empty samples. Other cases cover permitted retries, unsupported date ranges, per-company limits, running discoveries, and saved event pages.

The expected calls exclude unnecessary research, discovery, contact lookups, and writes. A simple task does not require a separate plan or a workspace read. An optional playbook read is allowed and counts as a tool call.

The optional `elapsedMs` and `creditsUsed` fields record measured values for the whole test run. Missing values stay `null`, not zero. Time and usage from stubbed tools do not establish production costs or discovery times. Expected call counts in these cases are test expectations, not customer limits.

To compare an existing version with a proposed version, repeat both runs with the same records and configuration. Report task success, broken requirements, call counts, measured time, and measured usage separately. Keep the model and tool definition versions with those measurements.

## Test the grader

Run `node --test .github/scripts/planning-eval.test.mjs` from the public repository root. The full `node --test .github/scripts/*.test.mjs` command also includes these tests. They use invented passing and failing traces to test the grader. They do not run a model or prove that an agent follows the skill. This repository contains no model evaluation result.
