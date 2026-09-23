import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { validatePlugin } from './validate-plugin.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '..', '..');

function writeJson(root, relativePath, value) {
  const absolutePath = path.join(root, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture(overrides = {}) {
  const root = path.join(
    tmpdir(),
    `trayo-plugin-validator-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  mkdirSync(root, { recursive: true });

  writeJson(root, '.claude-plugin/marketplace.json', {
    plugins: [{ name: 'trayo', source: './trayo', version: overrides.marketplaceVersion ?? '1.2.3' }],
  });
  writeJson(root, 'trayo/.claude-plugin/plugin.json', {
    name: 'trayo',
    version: overrides.pluginVersion ?? '1.2.3',
    repository: overrides.repository ?? 'https://github.com/trayoai/trayo-plugin',
  });
  writeJson(root, 'trayo/.mcp.json', {
    mcpServers: {
      trayo: { url: overrides.mcpUrl ?? 'https://api.trayo.ai/v1/mcp' },
    },
  });
  writeFileSync(path.join(root, 'README.md'), '# Public plugin\n');
  writeFileSync(path.join(root, 'trayo', 'README.md'), '# Trayo\n');

  return root;
}

test('validates the checked-in public plugin', () => {
  assert.match(validatePlugin(repoRoot), /^\d+\.\d+\.\d+$/);
});

test('rejects mismatched marketplace and plugin versions', (context) => {
  const root = createFixture({ marketplaceVersion: '1.2.4' });
  context.after(() => rmSync(root, { recursive: true, force: true }));

  assert.throws(() => validatePlugin(root), /does not match plugin version/);
});

test('rejects non-public repository and MCP endpoints', async (context) => {
  await context.test('repository', (childContext) => {
    const root = createFixture({ repository: 'https://example.com/internal-plugin' });
    childContext.after(() => rmSync(root, { recursive: true, force: true }));

    assert.throws(() => validatePlugin(root), /public Trayo plugin repository/);
  });

  await context.test('MCP endpoint', (childContext) => {
    const root = createFixture({ mcpUrl: 'https://example.com/v1/mcp' });
    childContext.after(() => rmSync(root, { recursive: true, force: true }));

    assert.throws(() => validatePlugin(root), /public production endpoint/);
  });
});

test('rejects private references and credential markers before release', async (context) => {
  for (const [name, contents, message] of [
    ['repository reference', 'trayoai/example-repo', /non-plugin repository reference/],
    ['repository lookalike', 'trayoai/trayo-plugin-extra', /non-plugin repository reference/],
    ['private key', '-----BEGIN PRIVATE KEY-----', /private key material/],
    ['GitHub token', `ghp_${'a'.repeat(30)}`, /GitHub token/],
  ]) {
    await context.test(name, (childContext) => {
      const root = createFixture();
      childContext.after(() => rmSync(root, { recursive: true, force: true }));
      writeFileSync(path.join(root, 'trayo', 'README.md'), `${contents}\n`);
      assert.throws(() => validatePlugin(root), message);
    });
  }
});

test('rejects symlinks in published content', (context) => {
  const root = createFixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  symlinkSync('README.md', path.join(root, 'trayo', 'linked-readme'));
  assert.throws(() => validatePlugin(root), /must not contain symlinks/);
});

test('every checked-in job skill has a complete final handoff', () => {
  const skillsRoot = path.join(repoRoot, 'trayo', 'skills');
  const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.equal(skillNames.length, 11);

  const readme = readFileSync(path.join(repoRoot, 'trayo', 'README.md'), 'utf8');
  for (const name of skillNames) {
    assert.ok(readme.includes(`/trayo:${name}`), `${name} is missing from the plugin guide`);
    const body = readFileSync(path.join(skillsRoot, name, 'SKILL.md'), 'utf8');
    const lastHeading = [...body.matchAll(/^## .*$/gm)].at(-1);
    assert.equal(lastHeading?.[0], '## Finish', `${name} has no final Finish section`);
    const finish = body.slice(lastHeading.index);
    assert.match(finish, /^Hand back\b/m, name);
    assert.match(finish, /^By now you must have\b/m, name);
    assert.match(finish, /wait for the user's pick/, name);
    const exits = ['- Keep it in Trayo:', '- Re-run it on your cadence:', '- Hand it off:'];
    const positions = exits.map((exit) => finish.indexOf(exit));
    assert.ok(positions.every((position) => position >= 0), `${name} is missing a handoff option`);
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), name);
    assert.match(body, /recipe `[a-z-]+`/, `${name} must name a public REST recipe`);
  }
});

test('plugin guides describe the same installed tool count', () => {
  const guide = readFileSync(path.join(repoRoot, 'trayo', 'README.md'), 'utf8');
  const summary = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const listLine = guide.split('\n').find((line) => line.includes('always loaded')) ?? '';
  const tools = new Set([...listLine.matchAll(/`(trayo_[a-z_]+)`/g)].map((match) => match[1]));
  assert.ok(tools.size > 0);
  assert.match(listLine, new RegExp(`^- ${tools.size} tools, always loaded`));
  for (const text of [guide, summary]) {
    const counts = [...text.matchAll(/connected with (\d+) tools/g)].map((match) => Number(match[1]));
    assert.ok(counts.length > 0);
    assert.ok(counts.every((count) => count === tools.size));
  }
});

test('monitoring examples use a backfill run or a saved account', () => {
  const body = readFileSync(path.join(repoRoot, 'trayo', 'skills', 'monitor-accounts', 'SKILL.md'), 'utf8');
  const examples = [...body.matchAll(/```json\s*([\s\S]*?)```/g)].map((match) => JSON.parse(match[1]));
  assert.equal(examples.length, 2);
  assert.equal(typeof examples[0].discoveryRunId, 'string');
  assert.equal(examples[0].expand, 'all');
  assert.equal(typeof examples[1].accountId, 'string');
  assert.deepEqual(Object.keys(examples[1]).sort(), ['accountId', 'discoveredSince', 'expand', 'signalKeys']);

  const restExample = body.match(/`GET (\/v1\/events\?[^`]+)`/)?.[1];
  assert.ok(restExample);
  const params = new URL(restExample, 'https://api.trayo.ai').searchParams;
  assert.deepEqual([...params.keys()].sort(), ['accountId', 'discoveredSince', 'expand', 'signalKeys']);
});

test('find-intent-accounts reads the workspace ICP and holds both checkpoints', () => {
  const body = readFileSync(path.join(repoRoot, 'trayo', 'skills', 'find-intent-accounts', 'SKILL.md'), 'utf8')
    .replace(/\s+/g, ' ');
  for (const phrase of [
    /`buyerProfile`/,
    /`buyerProfileSource`/,
    /`saved`/,
    /`partial`/,
    /`inferred`/,
    /`unreadable`/,
    /Do not present it as their ICP/,
    /\*\*Lookback:\*\* 90 days/,
    /\*\*Test size:\*\* 100 companies/,
    /an answer to any other question is not approval/,
    /waited for a go before scaling/,
  ]) assert.match(body, phrase);

  const discover = readFileSync(path.join(repoRoot, 'trayo', 'skills', 'discover-signals', 'SKILL.md'), 'utf8');
  assert.match(discover, /use skill `find-intent-accounts`/);
});

test('recent-movers skill explains bounded and sampled results', () => {
  const body = readFileSync(path.join(repoRoot, 'trayo', 'skills', 'recent-movers', 'SKILL.md'), 'utf8')
    .replace(/\s+/g, ' ');
  for (const phrase of [
    /detectedSince/,
    /90 days|90-day/,
    /destination searches already return the newest moves first/i,
    /does not recover omitted matches/i,
    /sampled/i,
    /retrying gives the same answer/i,
    /promotions/i,
    /trayo_create_signal/,
    /trayo_run_discovery/,
    /bounded slice/,
    /before filtering by source/,
    /`hasMore: false` does not prove completeness/,
    /not a departure search/,
  ]) assert.match(body, phrase);
  assert.doesNotMatch(body, /get fresher rows|send it again, narrower|thorough answer to who left/i);
});

test('strict Claude setup uses the public MCP endpoint and an environment variable', () => {
  const summary = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const guide = readFileSync(path.join(repoRoot, 'trayo', 'README.md'), 'utf8');
  assert.match(summary, /--strict-mcp-config/);
  assert.match(summary, /trayo\/README\.md/);
  const section = guide.split('### Claude Code with `--strict-mcp-config`')[1]?.split('## API-key plugin: Claude Cowork')[0];
  assert.ok(section);
  const config = JSON.parse(section.match(/```json\s*([\s\S]*?)```/)?.[1] ?? '{}');
  assert.deepEqual(config.mcpServers?.trayo, {
    type: 'http',
    url: 'https://api.trayo.ai/v1/mcp',
    headers: { 'X-API-Key': '${TRAYO_API_KEY}' },
    alwaysLoad: true,
    timeout: 120000,
  });
  assert.match(section, /Do not pass the plugin's own `\.mcp\.json`/);
});
