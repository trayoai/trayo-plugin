import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { publishedPaths, validatePlugin } from './validate-plugin.mjs';

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
    description: 'Trayo plugin',
    repository: overrides.repository ?? 'https://github.com/trayoai/trayo-plugin',
    license: 'MIT',
    privacyPolicyUrl: 'https://www.trayo.ai/privacy-policy/',
    termsOfServiceUrl: 'https://www.trayo.ai/terms-and-conditions/',
    documentationUrl: 'https://www.trayo.ai/mcp/',
    supportUrl: 'https://www.trayo.ai/mcp/',
    icon: './.claude-plugin/icon.svg',
    ...overrides.plugin,
  });
  writeJson(root, 'trayo/.mcp.json', {
    mcpServers: {
      trayo: { url: overrides.mcpUrl ?? 'https://api.trayo.ai/v1/mcp', ...overrides.mcpServer },
    },
  });
  writeJson(root, '.cursor-plugin/marketplace.json', {
    name: 'trayo-plugins',
    owner: { name: 'Trayo' },
    plugins: [{ name: 'trayo', source: './trayo', version: '1.2.3', ...overrides.cursorEntry }],
  });
  writeJson(root, 'trayo/.cursor-plugin/plugin.json', {
    name: 'trayo',
    version: '1.2.3',
    description: 'Trayo plugin',
    repository: overrides.repository ?? 'https://github.com/trayoai/trayo-plugin',
    license: 'MIT',
    logo: '.claude-plugin/icon.svg',
    ...overrides.cursorPlugin,
  });
  writeJson(root, 'trayo/mcp.json', overrides.cursorMcp ?? {
    mcpServers: { trayo: { url: 'https://api.trayo.ai/v1/mcp', ...overrides.cursorMcpServer } },
  });
  writeJson(root, 'gemini-extension.json', {
    name: 'trayo',
    version: '1.2.3',
    description: 'Trayo plugin',
    contextFileName: 'GEMINI.md',
    mcpServers: { trayo: { httpUrl: 'https://api.trayo.ai/v1/mcp', ...overrides.geminiServer } },
    ...overrides.gemini,
  });
  writeFileSync(path.join(root, 'GEMINI.md'), '# Trayo\n');
  writeFileSync(path.join(root, 'README.md'), '# Public plugin\n');
  writeFileSync(path.join(root, 'trayo', 'README.md'), '# Trayo\n');
  writeFileSync(path.join(root, 'trayo', 'LICENSE'), 'MIT License\n');
  writeFileSync(path.join(root, 'trayo', '.claude-plugin', 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>\n');

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

test('requires OAuth sign-in instead of bundled credentials', async (context) => {
  for (const [name, overrides] of [
    ['static header', { mcpServer: { headers: { Authorization: 'Bearer ${user_config.api_key}' } } }],
    ['plugin credential', { plugin: { userConfig: { api_key: { type: 'string', sensitive: true } } } }],
  ]) {
    await context.test(name, (childContext) => {
      const root = createFixture(overrides);
      childContext.after(() => rmSync(root, { recursive: true, force: true }));
      assert.throws(() => validatePlugin(root), /must sign in with OAuth/);
    });
  }
});

test('requires a declared license and a LICENSE file in the plugin folder', async (context) => {
  await context.test('license field', (childContext) => {
    const root = createFixture({ plugin: { license: undefined } });
    childContext.after(() => rmSync(root, { recursive: true, force: true }));
    assert.throws(() => validatePlugin(root), /must set license/);
  });

  await context.test('LICENSE file', (childContext) => {
    const root = createFixture();
    childContext.after(() => rmSync(root, { recursive: true, force: true }));
    rmSync(path.join(root, 'trayo', 'LICENSE'));
    assert.throws(() => validatePlugin(root), /include trayo\/LICENSE/);
  });
});

test('requires https directory listing URLs and an SVG icon inside the plugin', async (context) => {
  for (const [name, overrides, message] of [
    ['missing privacy policy', { plugin: { privacyPolicyUrl: undefined } }, /privacyPolicyUrl/],
    ['http privacy policy', { plugin: { privacyPolicyUrl: 'http://www.trayo.ai/privacy-policy/' } }, /privacyPolicyUrl/],
    ['missing terms of service', { plugin: { termsOfServiceUrl: undefined } }, /termsOfServiceUrl/],
    ['missing documentation', { plugin: { documentationUrl: undefined } }, /documentationUrl/],
    ['missing support', { plugin: { supportUrl: undefined } }, /supportUrl/],
    ['non-https support', { plugin: { supportUrl: 'mailto:support@example.com' } }, /supportUrl to an https:\/\/ URL/],
    ['missing icon field', { plugin: { icon: undefined } }, /icon must be an SVG file/],
    ['missing icon file', { plugin: { icon: './.claude-plugin/missing.svg' } }, /icon must be an SVG file/],
    ['icon outside the plugin', { plugin: { icon: '../README.md' } }, /icon must be an SVG file/],
  ]) {
    await context.test(name, (childContext) => {
      const root = createFixture(overrides);
      childContext.after(() => rmSync(root, { recursive: true, force: true }));
      assert.throws(() => validatePlugin(root), message);
    });
  }
});

test('keeps the Cursor manifests in sync with the Claude manifests', async (context) => {
  for (const [name, overrides, message] of [
    ['plugin name', { cursorPlugin: { name: 'trayo-cursor' } }, /Cursor plugin name must match/],
    ['plugin version', { cursorPlugin: { version: '1.2.4' } }, /Cursor plugin version must match/],
    ['plugin description', { cursorPlugin: { description: 'Something else' } }, /Cursor plugin description must match/],
    ['plugin license', { cursorPlugin: { license: 'Apache-2.0' } }, /Cursor plugin license must match/],
    ['marketplace version', { cursorEntry: { version: '1.2.4' } }, /Cursor marketplace entry must match/],
    ['marketplace source', { cursorEntry: { source: './other' } }, /Cursor marketplace Trayo source/],
    ['logo file', { cursorPlugin: { logo: 'assets/missing.svg' } }, /Cursor plugin logo must be an SVG/],
    ['logo outside the plugin', { cursorPlugin: { logo: '../README.md' } }, /Cursor plugin logo must be an SVG/],
    ['credential variables', { cursorPlugin: { variables: { type: 'object', properties: {} } } }, /credential variables/],
  ]) {
    await context.test(name, (childContext) => {
      const root = createFixture(overrides);
      childContext.after(() => rmSync(root, { recursive: true, force: true }));
      assert.throws(() => validatePlugin(root), message);
    });
  }

  await context.test('missing Cursor marketplace', (childContext) => {
    const root = createFixture();
    childContext.after(() => rmSync(root, { recursive: true, force: true }));
    rmSync(path.join(root, '.cursor-plugin'), { recursive: true });
    assert.throws(() => validatePlugin(root), /Could not read \.cursor-plugin\/marketplace\.json/);
  });
});

test('requires the Cursor MCP server to sign in with OAuth', async (context) => {
  for (const [name, overrides, message] of [
    ['static header', { cursorMcpServer: { headers: { Authorization: 'Bearer ${API_TOKEN}' } } }, /without headers/],
    ['static OAuth client', { cursorMcpServer: { auth: { CLIENT_ID: 'client' } } }, /without headers/],
    ['environment', { cursorMcpServer: { env: { TOKEN: 'value' } } }, /without headers/],
    ['other endpoint', { cursorMcpServer: { url: 'https://example.com/mcp' } }, /public production endpoint/],
    [
      'extra server',
      { cursorMcp: { mcpServers: { trayo: { url: 'https://api.trayo.ai/v1/mcp' }, other: { url: 'https://example.com/mcp' } } } },
      /only the Trayo server/,
    ],
  ]) {
    await context.test(name, (childContext) => {
      const root = createFixture(overrides);
      childContext.after(() => rmSync(root, { recursive: true, force: true }));
      assert.throws(() => validatePlugin(root), message);
    });
  }
});

test('keeps the Gemini CLI manifest at the repository root and in sync with the Claude manifest', async (context) => {
  for (const [name, overrides, message] of [
    ['name', { gemini: { name: 'trayo-gemini' } }, /Gemini extension name must match/],
    ['version', { gemini: { version: '1.2.4' } }, /Gemini extension version must match/],
    ['missing version', { gemini: { version: undefined } }, /Gemini extension version must match/],
    ['description', { gemini: { description: 'Something else' } }, /Gemini extension description must match/],
    ['context file name', { gemini: { contextFileName: 'trayo/GEMINI.md' } }, /contextFileName must be GEMINI\.md/],
    ['settings', {
      gemini: { settings: [{ name: 'API key', envVar: 'TRAYO_API_KEY', sensitive: true }] },
    }, /settings and credentials are not allowed/],
    ['excluded tools', { gemini: { excludeTools: ['run_shell_command'] } }, /may only set/],
  ]) {
    await context.test(name, (childContext) => {
      const root = createFixture(overrides);
      childContext.after(() => rmSync(root, { recursive: true, force: true }));
      assert.throws(() => validatePlugin(root), message);
    });
  }

  await context.test('manifest only inside the plugin folder', (childContext) => {
    const root = createFixture();
    childContext.after(() => rmSync(root, { recursive: true, force: true }));
    renameSync(path.join(root, 'gemini-extension.json'), path.join(root, 'trayo', 'gemini-extension.json'));
    assert.throws(() => validatePlugin(root), /gemini-extension\.json at the repository root/);
  });

  await context.test('missing context file', (childContext) => {
    const root = createFixture();
    childContext.after(() => rmSync(root, { recursive: true, force: true }));
    rmSync(path.join(root, 'GEMINI.md'));
    assert.throws(() => validatePlugin(root), /contextFileName must be GEMINI\.md/);
  });
});

test('requires the Gemini CLI MCP server to sign in with OAuth', async (context) => {
  for (const [name, overrides, message] of [
    ['static header', { geminiServer: { headers: { Authorization: 'Bearer token' } } }, /without headers/],
    ['OAuth client', { geminiServer: { oauth: { clientId: 'client', clientSecret: 'secret' } } }, /without headers/],
    ['environment', { geminiServer: { env: { TOKEN: 'value' } } }, /without headers/],
    ['SSE url', { geminiServer: { httpUrl: undefined, url: 'https://api.trayo.ai/v1/mcp' } }, /public production endpoint/],
    ['other endpoint', { geminiServer: { httpUrl: 'https://example.com/mcp' } }, /public production endpoint/],
    [
      'extra server',
      { gemini: { mcpServers: { trayo: { httpUrl: 'https://api.trayo.ai/v1/mcp' }, other: { httpUrl: 'https://example.com/mcp' } } } },
      /only the Trayo server/,
    ],
    ['no servers', { gemini: { mcpServers: undefined } }, /only the Trayo server/],
  ]) {
    await context.test(name, (childContext) => {
      const root = createFixture(overrides);
      childContext.after(() => rmSync(root, { recursive: true, force: true }));
      assert.throws(() => validatePlugin(root), message);
    });
  }

  await context.test('variable anywhere in the manifest', (childContext) => {
    const description = 'Trayo ${extensionPath}';
    const root = createFixture({ plugin: { description }, cursorPlugin: { description }, gemini: { description } });
    childContext.after(() => rmSync(root, { recursive: true, force: true }));
    assert.throws(() => validatePlugin(root), /must not reference \$\{\.\.\.\} variables/);
  });
});

test('scans the Gemini CLI files for private references', async (context) => {
  await context.test('context file', (childContext) => {
    const root = createFixture();
    childContext.after(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(path.join(root, 'GEMINI.md'), 'See trayoai/example-repo\n');
    assert.throws(() => validatePlugin(root), /unapproved repository reference: GEMINI\.md/);
  });

  await context.test('manifest', (childContext) => {
    const description = 'Built from trayoai/example-repo';
    const root = createFixture({ plugin: { description }, cursorPlugin: { description }, gemini: { description } });
    childContext.after(() => rmSync(root, { recursive: true, force: true }));
    assert.throws(() => validatePlugin(root), /unapproved repository reference: gemini-extension\.json/);
  });
});

test('scans the Cursor marketplace for private references', (context) => {
  const root = createFixture({ cursorEntry: { homepage: 'https://github.com/trayoai/example-repo' } });
  context.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => validatePlugin(root), /unapproved repository reference: \.cursor-plugin/);
});

test('rejects private references and credential markers before release', async (context) => {
  for (const [name, contents, message] of [
    ['repository reference', 'trayoai/example-repo', /unapproved repository reference/],
    ['repository lookalike', 'trayoai/trayo-plugin-extra', /unapproved repository reference/],
    ['UI repository lookalike', 'trayoai/ui-extra', /unapproved repository reference/],
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

test('allows the public UI source and its vendoring command', (context) => {
  const root = createFixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, 'trayo', 'README.md'), [
    'https://github.com/trayoai/ui/blob/main/README.md',
    'npx degit trayoai/ui/src src/trayo-ui',
  ].join('\n'));
  assert.equal(validatePlugin(root), '1.2.3');
});

test('rejects symlinks in published content', (context) => {
  const root = createFixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  symlinkSync('README.md', path.join(root, 'trayo', 'linked-readme'));
  assert.throws(() => validatePlugin(root), /must not contain symlinks/);
});

test('every checked-in skill is listed in the plugin guide', () => {
  const skillsRoot = path.join(repoRoot, 'trayo', 'skills');
  const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.equal(skillNames.length, 12);
  const readme = readFileSync(path.join(repoRoot, 'trayo', 'README.md'), 'utf8');
  for (const name of skillNames) {
    assert.ok(readme.includes(`/trayo:${name}`), `${name} is missing from the plugin guide`);
  }
});

test('every checked-in data workflow skill has a complete final handoff', () => {
  const skillsRoot = path.join(repoRoot, 'trayo', 'skills');
  const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'build-app')
    .map((entry) => entry.name);
  assert.equal(skillNames.length, 11);

  for (const name of skillNames) {
    const body = readFileSync(path.join(skillsRoot, name, 'SKILL.md'), 'utf8');
    const lastHeading = [...body.matchAll(/^## .*$/gm)].at(-1);
    assert.equal(lastHeading?.[0], '## Finish', `${name} has no final Finish section`);
    const finish = body.slice(lastHeading.index);
    assert.match(finish, /^Hand back\b/m, name);
    assert.match(finish, /^By now you must have\b/m, name);
    assert.match(finish, /wait for the user's pick/, name);
    const exits = ['- Keep it in Trayo:', '- Run it again on request:', '- Hand it off:'];
    const positions = exits.map((exit) => finish.indexOf(exit));
    assert.ok(positions.every((position) => position >= 0), `${name} is missing a handoff option`);
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), name);
    assert.match(body, /recipe `[a-z-]+`/, `${name} must name a public REST recipe`);
  }
});

test('plugin guides do not promise a fixed tool count', () => {
  // The tools a connection lists depend on the server release and the user's access, so the
  // guides send users to trayo_whoami instead of naming a count that goes stale.
  for (const file of ['README.md', path.join('trayo', 'README.md')]) {
    const text = readFileSync(path.join(repoRoot, file), 'utf8');
    assert.doesNotMatch(text, /\b\d+ tools\b/, file);
    assert.match(text, /should show as connected/, file);
    assert.match(text, /call `trayo_whoami`/, file);
  }
});

test('published plugin does not present Trayo-owned monitoring or recurring discovery', () => {
  const forbidden = /\bmonitor(?:ing|ed|s)?\b|\bstanding[\s-]+(?:scan|schedule)\b|\bTrayo\s+(?:automatically|periodically)\s+(?:runs?|starts?|checks?|scans?)\b|\bTrayo\s+(?:runs?|starts?)\s+(?:discovery|scans?|checks?)\s+automatically\b/i;

  function visit(relativePath) {
    assert.doesNotMatch(relativePath, forbidden, `Published path: ${relativePath}`);
    const absolutePath = path.join(repoRoot, relativePath);
    if (lstatSync(absolutePath).isDirectory()) {
      for (const entry of readdirSync(absolutePath)) visit(path.join(relativePath, entry));
      return;
    }
    assert.doesNotMatch(readFileSync(absolutePath, 'utf8'), forbidden, relativePath);
  }

  for (const relativePath of publishedPaths) visit(relativePath);
});

test('account event checks support caller-owned scheduling after approval', () => {
  const body = readFileSync(path.join(repoRoot, 'trayo', 'skills', 'check-account-events', 'SKILL.md'), 'utf8');
  assert.match(body, /^name: check-account-events$/m);
  assert.match(body, /scheduler they approved runs a REST script/);
  assert.match(body, /Each execution must call `POST \/v1\/discoveries`/);
  assert.match(body, /scope and frequency they approve/);
  assert.match(body, /Start an explicit discovery for every saved account and all selected signals/);
  assert.match(body, /recipe `discover-account-events`/);

  const readme = readFileSync(path.join(repoRoot, 'trayo', 'README.md'), 'utf8');
  assert.match(readme, /schedule that script in a system you control/);
  assert.match(readme, /Connecting MCP or saving accounts and signals does not start future discovery runs/);
});

test('account event examples use a backfill run or a saved account', () => {
  const body = readFileSync(path.join(repoRoot, 'trayo', 'skills', 'check-account-events', 'SKILL.md'), 'utf8');
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

test('strict Claude setup matches the bundled OAuth server entry', () => {
  const summary = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const guide = readFileSync(path.join(repoRoot, 'trayo', 'README.md'), 'utf8');
  const bundled = JSON.parse(readFileSync(path.join(repoRoot, 'trayo', '.mcp.json'), 'utf8'));
  assert.match(summary, /--strict-mcp-config/);
  assert.match(summary, /trayo\/README\.md/);
  const section = guide.split('### Claude Code with `--strict-mcp-config`')[1]?.split('\n### ')[0];
  assert.ok(section);
  const config = JSON.parse(section.match(/```json\s*([\s\S]*?)```/)?.[1] ?? '{}');
  assert.deepEqual(config.mcpServers?.trayo, bundled.mcpServers.trayo);
  assert.equal(config.mcpServers.trayo.headers, undefined);
  assert.match(section, /\/mcp/);
});

test('setup guides use OAuth sign-in and never read a key from the environment', () => {
  const summary = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const guide = readFileSync(path.join(repoRoot, 'trayo', 'README.md'), 'utf8');
  for (const text of [summary, guide]) {
    assert.match(text, /sign in with your Trayo account in the browser/i);
    assert.doesNotMatch(text, /TRAYO_API_KEY|--bearer-token-env-var|user_config|\/plugin configure/);
  }
});

test('Gemini CLI setup installs from this repository and signs in with /mcp auth', () => {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'gemini-extension.json'), 'utf8'));
  const context = readFileSync(path.join(repoRoot, 'GEMINI.md'), 'utf8');
  assert.deepEqual(Object.keys(manifest.mcpServers), ['trayo']);
  assert.match(context, /\/mcp auth trayo/);
  assert.match(context, /Call `trayo_whoami` first/);
  for (const file of ['README.md', path.join('trayo', 'README.md')]) {
    const text = readFileSync(path.join(repoRoot, file), 'utf8');
    const section = text.split(/^#{2,3} Gemini CLI$/m)[1]?.split(/^#{2,3} /m)[0];
    assert.ok(section, `${file} has no Gemini CLI section`);
    assert.match(section, /gemini extensions install https:\/\/github\.com\/trayoai\/trayo-plugin\n/, file);
    assert.match(section, /`\/mcp auth trayo`/, file);
    assert.match(section, /no API key/, file);
    assert.match(section, /`trayo_whoami`/, file);
  }
});

test('plugin files never read a credential from the environment', () => {
  const files = [
    'GEMINI.md',
    path.join('trayo', 'README.md'),
    ...readdirSync(path.join(repoRoot, 'trayo', 'skills')).map((name) => path.join('trayo', 'skills', name, 'SKILL.md')),
  ];
  for (const file of files) {
    const body = readFileSync(path.join(repoRoot, file), 'utf8');
    assert.doesNotMatch(body, /\$\{?[A-Z][A-Z0-9_]*\}?|Authorization: Bearer|TRAYO_API_KEY/, file);
  }
});
