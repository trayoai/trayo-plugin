# Trayo

Trayo finds companies and people, researches accounts, looks up emails and phones, reads LinkedIn posts, and
runs discoveries that find buying signals at companies and people. This extension connects Gemini CLI to the
Trayo MCP server at https://api.trayo.ai/v2/mcp and adds Trayo skills for common GTM workflows.

- The Trayo tools need the user to sign in. If the `trayo` MCP server is disconnected or needs
  authentication, ask the user to run `/mcp auth trayo`, sign in with their Trayo account in the
  browser, and approve a workspace. MCP OAuth sign-in needs no API key; do not look for credentials
  in files or the environment to repair an OAuth connection.
- When the user starts building an app, script, or integration with the Trayo REST API, use the
  `build-app` skill and prompt for API key setup before writing API integration code or calling
  authenticated REST routes, unless a key is already configured for this project and workspace.
  Ask them to create a key at https://app.trayo.ai/user/api-keys and configure `TRAYO_API_KEY` in their
  backend secret store or a local gitignored `.env` file. Never ask them to paste the key into chat
  or display its value. OAuth MCP sign-in does not supply REST credentials. Continue work that does
  not need credentials while they configure it, then verify REST authentication with `GET /v2/workspace`.
- Call `trayo_v2_get_workspace` first. It holds what the workspace sells, its stakeholders, its ideal
  customer profile and its saved signals.
- Gemini CLI lists the Trayo tools with an `mcp_trayo_` prefix, so `trayo_v2_get_workspace` appears as
  `mcp_trayo_trayo_v2_get_workspace`. The skills use the plain tool names.
- Search, resolve and research tools save nothing. Lists, workspace settings and discoveries change only
  through their write tools; use them only within what the user asked for. Research, discovery and
  contact lookups use the workspace's credits.
- When a result lists `next` calls, send them with their arguments unchanged. Read `notes`, `errors` and
  `unresolved` before saying coverage is complete or nothing matched.
- For a multi-step job, use the skill that matches it. For a simple lookup, call the tool directly.
