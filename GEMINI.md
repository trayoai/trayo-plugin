# Trayo

Trayo finds companies and people, researches accounts, looks up contact details, and surfaces buying
signals for the accounts in a Trayo workspace. This extension connects Gemini CLI to the Trayo MCP
server at https://api.trayo.ai/v1/mcp and adds twelve Trayo skills for common GTM workflows.

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
  not need credentials while they configure it, then verify REST authentication with `GET /v1/whoami`.
- Call `trayo_whoami` first. It confirms the workspace, the user, and their permissions.
- Gemini CLI lists the Trayo tools with an `mcp_trayo_` prefix, so `trayo_whoami` appears as
  `mcp_trayo_trayo_whoami`. The skills use the plain tool names.
- Find, search and research tools save nothing. Add companies with `trayo_import_accounts` and people
  with `trayo_add_people` only once the user has agreed on the set; write tools change the workspace.
