# Trayo plugin

The official Trayo plugin gives AI coding and work agents access to Trayo's company and people search, lookalikes, account research, contact enrichment, signals, discovery, and events. It includes ten skills that turn those tools into common GTM workflows.

You need a Trayo workspace API key from **Admin → API keys**.

## Claude Code

```bash
claude plugin marketplace add trayoai/trayo-plugin
claude plugin install trayo@trayo-plugins
```

Run `/plugin configure trayo@trayo-plugins` and enter the key in the masked field.

Start a new Claude Code session, then run `/mcp`. The `trayo` server should be connected with 28 tools.

## Codex

```bash
codex plugin marketplace add trayoai/trayo-plugin
codex plugin add trayo@trayo-plugins
codex mcp add trayo --url https://api.trayo.ai/v1/mcp --bearer-token-env-var TRAYO_API_KEY
```

Make `TRAYO_API_KEY` available to Codex through your existing secret setup or `~/.codex/.env`, then restart Codex.

For Claude Cowork, install the plugin for its skills, then add a custom connector at
`https://api.trayo.ai/v1/mcp`. Choose **No sign-in** and add the request header
`x-api-key: <your workspace API key>`. Other MCP clients may use that header or
`Authorization: Bearer <key>`.

After setup, call `trayo_whoami`; a successful response confirms the connection and key.

See [the plugin guide](trayo/README.md) for complete setup steps, the available skills, required key scopes, and current limitations.
