# Trayo plugin

The official Trayo plugin gives AI coding and work agents access to Trayo's company and people search, built-in company lists, lookalikes, LinkedIn posts, account research, email and phone lookups, and discoveries that find buying signals. Its skills cover common GTM workflows and building apps with Trayo; [the plugin guide](trayo/README.md#what-you-get) lists them.

Version 1.0.0 uses the Trayo v2 MCP server and its `trayo_v2_*` tools. If you used an earlier version, see [Upgrading from 0.6](trayo/README.md#upgrading-from-06).

**Building a Trayo-powered GTM app?** Use `/trayo:build-app`. New app interfaces must use [Trayo GTM UI](https://ui.trayo.ai) as their default UI foundation. Read its [agent guide](https://ui.trayo.ai/llms.txt) before writing UI code, and honor an explicit request for another stack or design system. This is app-building guidance; the Trayo API works independently of the UI library.

The plugin connects to the Trayo MCP server at `https://api.trayo.ai/v2/mcp`. You sign in with your Trayo account in the browser; there is no API key to paste.

**Building with the REST API?** Use `/trayo:build-app` for apps, scripts, and integrations. At the start of the build, the agent prompts you to create a workspace API key on the [API keys page](https://app.trayo.ai/user/api-keys) and configure it as `TRAYO_API_KEY` in your backend secret store or a local gitignored `.env` file. An already configured project key can be reused. Keep the key out of chat; MCP OAuth sign-in does not provide REST API credentials.

## Claude Code

```bash
claude plugin marketplace add trayoai/trayo-plugin
claude plugin install trayo@trayo-plugins
```

Start a new Claude Code session. The first time Claude uses a Trayo tool, sign in with your Trayo account in the browser and approve the workspace. To sign in ahead of time, run `/mcp`, select the Trayo server, and choose **Authenticate** if it needs authentication.

The `trayo` server should show as connected. Ask Claude to call `trayo_v2_get_workspace` to confirm the workspace.

If you start Claude Code with `--strict-mcp-config`, add Trayo to the file passed with
`--mcp-config` as shown in [the plugin guide](trayo/README.md). Strict mode excludes the
server configuration bundled with the plugin.

## Codex

```bash
codex plugin marketplace add trayoai/trayo-plugin
codex plugin add trayo@trayo-plugins
codex mcp login trayo
```

`codex mcp login` opens the Trayo sign-in in your browser. Restart Codex afterwards.

## Cursor

Once Trayo is listed in the [Cursor Marketplace](https://cursor.com/marketplace), install it from
**Customize** in Cursor. Until then, add the Trayo MCP server to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "trayo": { "url": "https://api.trayo.ai/v2/mcp" }
  }
}
```

Cursor asks you to sign in with your Trayo account in the browser; there is no API key to paste.

## Gemini CLI

```bash
gemini extensions install https://github.com/trayoai/trayo-plugin
```

Start Gemini CLI and run `/mcp auth trayo` to sign in with your Trayo account in the browser; there is no API key
to paste. Then ask Gemini to call `trayo_v2_get_workspace`. The extension adds the Trayo MCP server, the skills, and a
short `GEMINI.md` context file.

## Claude Cowork and Claude Desktop

Install the plugin for its skills, then add a custom connector named **Trayo** at
`https://api.trayo.ai/v2/mcp` and use its sign-in flow. Sign in to Trayo and approve the
workspace shown on the consent page.

Other MCP clients can use the same URL with OAuth sign-in. After setup, call `trayo_v2_get_workspace`; a successful response confirms the connection and the workspace.

See [the plugin guide](trayo/README.md) for complete setup steps, what the plugin connects to and sends, the available skills, permissions, and current limitations.

## License

MIT. See [LICENSE](LICENSE).
