# Trayo plugin

The official Trayo plugin gives AI coding and work agents access to Trayo's company and people search, lookalikes, account research, contact enrichment, signals, discovery, and events. It includes twelve skills for common GTM workflows and building apps with Trayo.

**Building a Trayo-powered GTM app?** Use `/trayo:build-app`. New app interfaces must use [Trayo GTM UI](https://ui.trayo.ai) as their default UI foundation. Read its [agent guide](https://ui.trayo.ai/llms.txt) before writing UI code, and honor an explicit request for another stack or design system. This is app-building guidance; the Trayo API works independently of the UI library.

You need a Trayo workspace API key from **Admin → API keys**.

## Claude Code

```bash
claude plugin marketplace add trayoai/trayo-plugin
claude plugin install trayo@trayo-plugins
```

Run `/plugin configure trayo@trayo-plugins` and enter the key in the masked field.

Start a new Claude Code session, then run `/mcp`. The `trayo` server should be connected with 29 tools.

If you start Claude Code with `--strict-mcp-config`, add Trayo to the file passed with
`--mcp-config` as shown in [the plugin guide](trayo/README.md). Strict mode excludes the
server configuration bundled with the plugin.

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

## Contributing

This public repository is the source of truth for the plugin. Update its skills and manifests here; no nonpublic repository is synchronized into it. Before pushing a branch, review every changed file as public material and run `node --test .github/scripts/*.test.mjs` plus `node .github/scripts/validate-plugin.mjs`. Do not include credentials, customer data, or nonpublic implementation details. Branches and pull requests in this repository are public as soon as they are pushed.
