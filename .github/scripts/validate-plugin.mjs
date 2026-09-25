import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);

  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read ${relativePath}: ${error.message}`, { cause: error });
  }
}

const forbiddenContent = [
  { name: 'unapproved repository reference', pattern: /\btrayoai\/(?!(?:trayo-plugin|ui)(?=[^a-z0-9._-]|$))[a-z0-9._-]+\b/i },
  { name: 'private key material', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'GitHub token', pattern: /\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
];

function validatePublicFiles(root) {
  function visit(relativePath) {
    const absolutePath = path.join(root, relativePath);
    const stat = lstatSync(absolutePath);
    invariant(!stat.isSymbolicLink(), `Published content must not contain symlinks: ${relativePath}`);

    if (stat.isDirectory()) {
      for (const name of readdirSync(absolutePath)) visit(path.join(relativePath, name));
      return;
    }

    invariant(stat.isFile(), `Unsupported published file: ${relativePath}`);
    let contents;
    try {
      contents = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(absolutePath));
    } catch {
      throw new Error(`Published file must be UTF-8 text: ${relativePath}`);
    }
    for (const { name, pattern } of forbiddenContent) {
      invariant(!pattern.test(contents), `Published content contains ${name}: ${relativePath}`);
    }
  }

  for (const relativePath of ['README.md', '.claude-plugin', 'trayo']) visit(relativePath);
}

export function validatePlugin(root = process.cwd()) {
  const marketplace = readJson(root, '.claude-plugin/marketplace.json');
  const plugin = readJson(root, 'trayo/.claude-plugin/plugin.json');
  const mcp = readJson(root, 'trayo/.mcp.json');
  const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const trayoEntries = entries.filter((entry) => entry?.name === 'trayo');

  invariant(trayoEntries.length === 1, 'Marketplace must contain exactly one Trayo plugin entry.');

  const marketplacePlugin = trayoEntries[0];
  invariant(marketplacePlugin.source === './trayo', 'Marketplace Trayo source must be ./trayo.');
  invariant(
    typeof plugin.version === 'string' && /^\d+\.\d+\.\d+$/.test(plugin.version),
    `Plugin version must be stable semver (x.y.z), got: ${String(plugin.version)}`,
  );
  invariant(
    marketplacePlugin.version === plugin.version,
    `Marketplace version ${String(marketplacePlugin.version)} does not match plugin version ${plugin.version}.`,
  );
  invariant(
    plugin.repository === 'https://github.com/trayoai/trayo-plugin',
    'Plugin repository must point to the public Trayo plugin repository.',
  );
  invariant(
    mcp?.mcpServers?.trayo?.url === 'https://api.trayo.ai/v1/mcp',
    'Trayo MCP server must use the public production endpoint.',
  );

  validatePublicFiles(root);

  return plugin.version;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  try {
    const root = path.resolve(process.argv[2] ?? '.');
    console.log(validatePlugin(root));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
