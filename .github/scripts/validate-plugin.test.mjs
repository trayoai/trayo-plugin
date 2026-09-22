import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
