import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

export const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8'));
// Routing calls are permitted but still counted. Workspace/allowance reads are unnecessary
// in these cases because their setup supplies that context.
const routingTools = new Set(['trayo_get_playbook']);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Order and capitalization of alternatives do not change these test queries.
function canonical(value, foldCase = false) {
  if (typeof value === 'string') return foldCase ? value.toLowerCase() : value;
  if (Array.isArray(value)) return value.map((item) => canonical(item, foldCase)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (object(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, canonical(item, ['any', 'all', 'exclude', 'concepts', 'excludedPhrases', 'countries'].includes(key))]));
  return value;
}

function matches(actual, expected) {
  if (object(expected)) return object(actual) && Object.entries(expected).every(([key, value]) => matches(actual[key], value));
  return isDeepStrictEqual(actual, expected);
}

export function grade(trace) {
  if (!object(trace)) throw new Error('Trace must be an object');
  const scenario = cases.find((candidate) => candidate.id === trace.caseId);
  if (!scenario) throw new Error(`Unknown case: ${trace.caseId}`);
  if (!Array.isArray(trace.calls) || trace.calls.some((call) => !object(call) || typeof call.tool !== 'string' || !object(call.arguments))) {
    throw new Error('calls must contain objects with tool and arguments');
  }
  if (typeof trace.final !== 'string' || !trace.final.trim()) throw new Error('final must contain the agent answer');
  for (const key of ['elapsedMs', 'creditsUsed']) {
    if (trace[key] !== undefined && (!Number.isFinite(trace[key]) || trace[key] < 0)) throw new Error(`${key} must be a nonnegative measured number`);
  }

  const failures = [];
  const calls = trace.calls.filter((call) => !routingTools.has(call.tool));
  if (calls.length !== scenario.steps.length) failures.push(`Expected ${scenario.steps.length} data calls, observed ${calls.length}`);
  scenario.steps.forEach((step, index) => {
    const call = calls[index];
    if (!call || call.tool !== step.tool) {
      failures.push(`Call ${index + 1}: expected ${step.tool}, observed ${call?.tool ?? 'none'}`);
      return;
    }
    if (!matches(canonical(call.arguments), canonical(step.arguments))) failures.push(`Call ${index + 1}: required arguments changed or missing`);
    for (const key of step.exactArguments ?? []) {
      if (!isDeepStrictEqual(canonical(call.arguments)[key], canonical(step.arguments)[key])) failures.push(`Call ${index + 1}: ${key} broadened or narrowed`);
    }
    for (const key of step.absentArguments ?? []) {
      if (Object.hasOwn(call.arguments, key)) failures.push(`Call ${index + 1}: unexpected ${key}`);
    }
  });

  return {
    caseId: scenario.id,
    trajectoryPassed: failures.length === 0,
    // Tool names/arguments cannot prove result inspection or a grounded final answer.
    outcome: failures.length ? 'trajectory_failed' : 'needs_semantic_review',
    failures,
    review: ['Verify the setup and ordered tool responses in the original transcript.', ...scenario.review],
    metrics: {
      toolCalls: trace.calls.length,
      dataCalls: calls.length,
      elapsedMs: trace.elapsedMs ?? null,
      creditsUsed: trace.creditsUsed ?? null,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node evals/planning/grade.mjs /path/to/trace.json');
    const result = grade(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.log(JSON.stringify(result, null, 2));
    if (!result.trajectoryPassed) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
