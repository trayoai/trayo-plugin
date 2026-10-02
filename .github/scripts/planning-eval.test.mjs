import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { cases, grade } from '../../evals/planning/grade.mjs';

function trace(id) {
  const scenario = cases.find((item) => item.id === id);
  return { caseId: id, calls: scenario.steps.map((step) => ({ tool: step.tool, arguments: structuredClone(step.arguments) })), final: 'Synthetic answer; requires semantic review.' };
}

test('cases have unique IDs, prompts, result setups and semantic rubrics', () => {
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length);
  for (const item of cases) {
    assert.ok(item.prompt && item.setup && item.review.length);
    assert.ok(Array.isArray(item.steps));
  }
});

for (const scenario of cases) {
  test(`${scenario.id}: matching trajectory still needs semantic review`, () => {
    const result = grade(trace(scenario.id));
    assert.equal(result.trajectoryPassed, true);
    assert.equal(result.outcome, 'needs_semantic_review');
    assert.equal(result.metrics.elapsedMs, null);
    assert.equal(result.metrics.creditsUsed, null);
    assert.ok(result.review.length > 0);
  });

  test(`${scenario.id}: unnecessary discovery fails`, () => {
    const input = trace(scenario.id);
    input.calls.push({ tool: 'trayo_run_discovery', arguments: {} });
    assert.equal(grade(input).trajectoryPassed, false);
  });
}

test('preserves numeric bounds and rejects an invented extra company filter', () => {
  for (const mutate of [
    (args) => { args.filters.headcount.max = 500; },
    (args) => { args.filters.hq = { countries: ['US'] }; },
    (args) => { args.query = 'similar companies'; },
    (args) => { args.mode = 'semantic'; },
  ]) {
    const input = trace('company-title-join');
    mutate(input.calls[0].arguments);
    assert.equal(grade(input).trajectoryPassed, false);
  }
});

test('accepts capitalization and order of title alternatives', () => {
  const input = trace('company-title-join');
  input.calls[0].arguments.filters.title.any = ['Chief Technology Officer', 'CTO'];
  assert.equal(grade(input).trajectoryPassed, true);
});

test('requires month start semantics, destination geography and title expansion', () => {
  for (const mutate of [
    (args) => { delete args.startedSince; args.detectedSince = '2026-09-01'; },
    (args) => { args.destinationFilters.hq.countries = ['GB']; },
    (args) => { args.title.any = ['ciso']; },
  ]) {
    const input = trace('role-start-month');
    mutate(input.calls[0].arguments);
    assert.equal(grade(input).trajectoryPassed, false);
  }
});

test('rejects lost AND boundaries, missing exclusions and changed dates', () => {
  for (const mutate of [
    (args) => { args.concepts = [args.concepts.flat()]; },
    (args) => { delete args.excludedPhrases; },
    (args) => { args.windowDays = 1; },
  ]) {
    const input = trace('post-concepts-empty-sample');
    mutate(input.calls[0].arguments);
    assert.equal(grade(input).trajectoryPassed, false);
  }
});

test('rejects repeating a successful empty query', () => {
  const input = trace('post-concepts-empty-sample');
  input.calls.push(structuredClone(input.calls[0]));
  assert.equal(grade(input).trajectoryPassed, false);
});

test('rejects reusing a cursor after changing the per-company cap', () => {
  const input = trace('revise-people-cap');
  input.calls[0].arguments.cursor = 'old-cursor';
  assert.equal(grade(input).trajectoryPassed, false);
});

test('requires polling the same run and rejects premature termination', () => {
  const wrongRun = trace('resume-pending-discovery');
  wrongRun.calls[1].arguments.runId = 'another-run';
  assert.equal(grade(wrongRun).trajectoryPassed, false);
  const early = trace('resume-pending-discovery');
  early.calls.splice(1, 1);
  assert.equal(grade(early).trajectoryPassed, false);
});

test('requires all saved-result pages in the same scope', () => {
  const input = trace('reuse-event-pages');
  input.calls[1].arguments.cursor = 'page-2';
  assert.equal(grade(input).trajectoryPassed, false);
});

test('opaque run IDs and cursors remain case-sensitive', () => {
  const input = trace('reuse-event-pages');
  input.calls[0].arguments.cursor = 'PAGE-2';
  assert.equal(grade(input).trajectoryPassed, false);
  const run = trace('resume-pending-discovery');
  run.calls[0].arguments.runId = 'RUN-SAMPLE';
  assert.equal(grade(run).trajectoryPassed, false);
});

test('counts routing and measured usage without claiming semantic success', () => {
  const input = trace('company-title-join');
  input.calls.unshift({ tool: 'trayo_get_playbook', arguments: { goal: 'plan-gtm-work' } });
  input.elapsedMs = 100;
  input.creditsUsed = 0;
  const result = grade(input);
  assert.equal(result.trajectoryPassed, true);
  assert.deepEqual(result.metrics, { toolCalls: 2, dataCalls: 1, elapsedMs: 100, creditsUsed: 0 });
});

test('rejects missing calls, final answer, unknown cases and invalid metrics', () => {
  for (const input of [null, {}, { caseId: 'unknown' }, { ...trace(cases[0].id), calls: [null] }, { ...trace(cases[0].id), final: '' }, { ...trace(cases[0].id), creditsUsed: -1 }]) {
    assert.throws(() => grade(input));
  }
});

test('CLI distinguishes trajectory failure, invalid input and pending semantic review', (context) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'trayo-planning-eval-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'trace.json');
  const cli = fileURLToPath(new URL('../../evals/planning/grade.mjs', import.meta.url));
  const run = () => spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
  writeFileSync(file, JSON.stringify(trace('company-title-join')));
  const good = run();
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).outcome, 'needs_semantic_review');
  writeFileSync(file, JSON.stringify({ ...trace('company-title-join'), calls: [] }));
  assert.equal(run().status, 1);
  writeFileSync(file, 'invalid JSON');
  assert.equal(run().status, 2);
  assert.equal(spawnSync(process.execPath, [cli], { encoding: 'utf8' }).status, 2);
});
