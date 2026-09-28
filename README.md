# Trayo plugin

The official Trayo plugin gives AI coding and work agents access to Trayo's company and people search, lookalikes, account research, contact enrichment, signals, discovery, and events. It includes twelve skills for common GTM workflows and building apps with Trayo.

**Building a Trayo-powered GTM app?** Use `/trayo:build-app`. New app interfaces must use [Trayo GTM UI](https://ui.trayo.ai) as their default UI foundation. Read its [agent guide](https://ui.trayo.ai/llms.txt) before writing UI code, and honor an explicit request for another stack or design system. This is app-building guidance; the Trayo API works independently of the UI library.

The plugin connects to the Trayo MCP server at `https://api.trayo.ai/v1/mcp`. You sign in with your Trayo account in the browser; there is no API key to paste.

## Claude Code

```bash
claude plugin marketplace add trayoai/trayo-plugin
claude plugin install trayo@trayo-plugins
```

Start a new Claude Code session. The first time Claude uses a Trayo tool, sign in with your Trayo account in the browser and approve the workspace. To sign in ahead of time, run `/mcp`, select the Trayo server, and choose **Authenticate** if it needs authentication.

The `trayo` server should be connected with 29 tools. Ask Claude to call `trayo_whoami` to confirm the workspace and your permissions.

If you start Claude Code with `--strict-mcp-config`, add Trayo to the file passed with
`--mcp-config` as shown in [the plugin guide](trayo/README.md). Strict mode excludes the
server configuration bundled with the plugin.

## Codex

```bash
codex plugin marketplace add trayoai/trayo-plugin
codex plugin add trayo@trayo-plugins
codex mcp add trayo --url https://api.trayo.ai/v1/mcp
codex mcp login trayo
```

`codex mcp login` opens the Trayo sign-in in your browser. Restart Codex afterwards.

## Cursor

Once Trayo is listed in the [Cursor Marketplace](https://cursor.com/marketplace), install it from
**Customize** in Cursor. Until then, add the Trayo MCP server to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "trayo": { "url": "https://api.trayo.ai/v1/mcp" }
  }
}
```

Cursor asks you to sign in with your Trayo account in the browser; there is no API key to paste.

## Claude Cowork and Claude Desktop

Install the plugin for its skills, then add a custom connector named **Trayo** at
`https://api.trayo.ai/v1/mcp` and use its sign-in flow. Sign in to Trayo and approve the
workspace shown on the consent page.

Other MCP clients can use the same URL with OAuth sign-in. After setup, call `trayo_whoami`; a successful response confirms the connection, the workspace, and your permissions.

See [the plugin guide](trayo/README.md) for complete setup steps, what the plugin connects to and sends, the available skills, permissions, and current limitations.

## License

MIT. See [LICENSE](LICENSE).

## Contributing

This public repository is the source of truth for the plugin. Update its skills and manifests here; no nonpublic repository is synchronized into it. Before pushing a branch, review every changed file as public material and run `node --test .github/scripts/*.test.mjs` plus `node .github/scripts/validate-plugin.mjs`. Do not include credentials, customer data, or nonpublic implementation details. Branches and pull requests in this repository are public as soon as they are pushed.
