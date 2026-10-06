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

function isFile(root, relativePath) {
  try {
    return lstatSync(path.join(root, relativePath)).isFile();
  } catch {
    return false;
  }
}

function isPluginSvg(root, relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) return false;
  const resolved = path.normalize(path.join('trayo', relativePath));
  return resolved.startsWith(`trayo${path.sep}`) && resolved.endsWith('.svg') && isFile(root, resolved);
}

function validateCursorPlugin(root, claudeEntry, claudePlugin) {
  const marketplace = readJson(root, '.cursor-plugin/marketplace.json');
  const plugin = readJson(root, 'trayo/.cursor-plugin/plugin.json');
  const mcp = readJson(root, 'trayo/mcp.json');
  const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const trayoEntries = entries.filter((entry) => entry?.name === 'trayo');

  invariant(trayoEntries.length === 1, 'Cursor marketplace must contain exactly one Trayo plugin entry.');
  const entry = trayoEntries[0];
  invariant(entry.source === './trayo', 'Cursor marketplace Trayo source must be ./trayo.');
  invariant(
    entry.version === claudeEntry.version && entry.description === claudeEntry.description,
    'Cursor marketplace entry must match the Claude marketplace entry version and description.',
  );
  for (const field of ['name', 'version', 'description', 'license', 'repository']) {
    invariant(
      plugin[field] === claudePlugin[field],
      `Cursor plugin ${field} must match the Claude plugin manifest.`,
    );
  }
  invariant(plugin.variables === undefined, 'Cursor plugin must not declare credential variables.');
  invariant(isPluginSvg(root, plugin.logo), 'Cursor plugin logo must be an SVG file inside trayo/.');

  const server = mcp?.mcpServers?.trayo;
  invariant(
    server?.url === 'https://api.trayo.ai/v1/mcp' && Object.keys(mcp.mcpServers).length === 1,
    'Cursor mcp.json must declare only the Trayo server at the public production endpoint.',
  );
  invariant(
    Object.keys(server).every((key) => key === 'url' || key === 'type')
      && !readFileSync(path.join(root, 'trayo/mcp.json'), 'utf8').includes('${'),
    'Cursor mcp.json must sign in with OAuth, without headers, auth, env, or placeholders.',
  );
}

// Codex reads trayo/.codex-plugin/plugin.json before the Claude manifest, and takes its name, logo and
// links only from `interface`. Skills and the MCP server stay on the defaults (trayo/skills, trayo/.mcp.json),
// so an inline skills or mcpServers entry would bypass the trayo/.mcp.json checks.
const codexPluginKeys = new Set(['name', 'version', 'description', 'keywords', 'interface']);
const codexInterfaceKeys = new Set([
  'displayName', 'developerName', 'websiteURL', 'privacyPolicyURL', 'termsOfServiceURL', 'composerIcon', 'logo',
]);

function validateCodexPlugin(root, claudePlugin) {
  const plugin = readJson(root, 'trayo/.codex-plugin/plugin.json');
  const ui = plugin.interface ?? {};

  invariant(
    Object.keys(plugin).every((key) => codexPluginKeys.has(key)),
    `Codex plugin may only set ${[...codexPluginKeys].join(', ')}.`,
  );
  invariant(
    Object.keys(ui).every((key) => codexInterfaceKeys.has(key)),
    `Codex plugin interface may only set ${[...codexInterfaceKeys].join(', ')}.`,
  );
  for (const field of ['name', 'version', 'description']) {
    invariant(plugin[field] === claudePlugin[field], `Codex plugin ${field} must match the Claude plugin manifest.`);
  }
  invariant(
    JSON.stringify(plugin.keywords) === JSON.stringify(claudePlugin.keywords),
    'Codex plugin keywords must match the Claude plugin manifest.',
  );
  invariant(ui.displayName === claudePlugin.displayName, 'Codex plugin displayName must match the Claude plugin manifest.');
  invariant(ui.websiteURL === claudePlugin.homepage, 'Codex plugin websiteURL must match the Claude plugin homepage.');
  invariant(
    ui.privacyPolicyURL === claudePlugin.privacyPolicyUrl && ui.termsOfServiceURL === claudePlugin.termsOfServiceUrl,
    'Codex plugin policy links must match the Claude plugin manifest.',
  );
  // Codex resolves interface paths only when they start with `./`, relative to the plugin root.
  for (const field of ['logo', 'composerIcon']) {
    invariant(
      typeof ui[field] === 'string' && ui[field].startsWith('./') && isPluginSvg(root, ui[field]),
      `Codex plugin interface.${field} must be a ./ path to an SVG file inside trayo/.`,
    );
  }
}

// Claude Code refuses to install a plugin whose plugin.json has a field it cannot parse, and an inline
// mcpServers entry would bypass the trayo/.mcp.json checks. Add a field only after
// `claude plugin validate .` accepts it.
const claudePluginKeys = new Set([
  'name', 'displayName', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords',
  'icon', 'privacyPolicyUrl', 'termsOfServiceUrl', 'documentationUrl', 'supportUrl',
]);

// Gemini CLI reads gemini-extension.json from the extension root, which is the repository root for
// git installs and the gallery crawler, and the archive root for the release asset.
const geminiManifestKeys = new Set(['name', 'version', 'description', 'contextFileName', 'mcpServers']);

function validateGeminiExtension(root, claudePlugin) {
  invariant(isFile(root, 'gemini-extension.json'), 'Gemini CLI manifest must be gemini-extension.json at the repository root.');
  const manifest = readJson(root, 'gemini-extension.json');

  for (const field of ['name', 'version', 'description']) {
    invariant(
      typeof manifest[field] === 'string' && manifest[field] === claudePlugin[field],
      `Gemini extension ${field} must match the Claude plugin manifest.`,
    );
  }
  invariant(
    Object.keys(manifest).every((key) => geminiManifestKeys.has(key)),
    `Gemini extension may only set ${[...geminiManifestKeys].join(', ')}; settings and credentials are not allowed.`,
  );
  invariant(
    manifest.contextFileName === 'GEMINI.md' && isFile(root, 'GEMINI.md'),
    'Gemini extension contextFileName must be GEMINI.md, present at the repository root.',
  );

  const servers = manifest.mcpServers ?? {};
  const server = servers.trayo;
  invariant(
    server?.httpUrl === 'https://api.trayo.ai/v1/mcp' && Object.keys(servers).length === 1,
    'Gemini extension must declare only the Trayo server at the public production endpoint.',
  );
  invariant(
    Object.keys(server).every((key) => key === 'httpUrl'),
    'Gemini extension MCP server must sign in with OAuth, without headers, auth, env, or placeholders.',
  );
  invariant(
    !readFileSync(path.join(root, 'gemini-extension.json'), 'utf8').includes('${'),
    'Gemini extension must not reference ${...} variables or the environment.',
  );
}

const forbiddenContent = [
  { name: 'unapproved repository reference', pattern: /\btrayoai\/(?!(?:trayo-plugin|ui)(?=[^a-z0-9._-]|$))[a-z0-9._-]+\b/i },
  { name: 'private key material', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'GitHub token', pattern: /\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
];

// Everything a client installs. CI requires a version increase when any of these paths change.
export const publishedPaths = ['.claude-plugin', '.cursor-plugin', 'README.md', 'GEMINI.md', 'gemini-extension.json', 'trayo'];

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

  for (const relativePath of publishedPaths) visit(relativePath);
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
  const unknownKeys = Object.keys(plugin).filter((key) => !claudePluginKeys.has(key));
  invariant(
    unknownKeys.length === 0,
    `Plugin manifest may only set ${[...claudePluginKeys].join(', ')}; found ${unknownKeys.join(', ')}. `
      + 'Declare MCP servers in trayo/.mcp.json.',
  );
  invariant(
    plugin.repository === 'https://github.com/trayoai/trayo-plugin',
    'Plugin repository must point to the public Trayo plugin repository.',
  );
  invariant(
    mcp?.mcpServers?.trayo?.url === 'https://api.trayo.ai/v1/mcp',
    'Trayo MCP server must use the public production endpoint.',
  );
  invariant(
    mcp.mcpServers.trayo.headers === undefined && plugin.userConfig === undefined,
    'Trayo MCP server must sign in with OAuth, without static headers or plugin credentials.',
  );
  invariant(
    typeof plugin.license === 'string' && plugin.license.length > 0 && isFile(root, 'trayo/LICENSE'),
    'Plugin must set license in plugin.json and include trayo/LICENSE.',
  );
  // Anthropic's directory listing reads these links from plugin.json.
  for (const field of ['privacyPolicyUrl', 'termsOfServiceUrl', 'documentationUrl', 'supportUrl']) {
    invariant(
      typeof plugin[field] === 'string' && plugin[field].startsWith('https://'),
      `Plugin must set ${field} to an https:// URL.`,
    );
  }
  invariant(isPluginSvg(root, plugin.icon), 'Plugin icon must be an SVG file inside trayo/.');

  validateCursorPlugin(root, marketplacePlugin, plugin);
  validateCodexPlugin(root, plugin);
  validateGeminiExtension(root, plugin);
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
