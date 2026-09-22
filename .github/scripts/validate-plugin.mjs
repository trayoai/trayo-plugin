import { readFileSync } from 'node:fs';
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
