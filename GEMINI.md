# Trayo

Trayo finds companies and people, researches accounts, looks up contact details, and surfaces buying
signals for the accounts in a Trayo workspace. This extension connects Gemini CLI to the Trayo MCP
server at https://api.trayo.ai/v1/mcp and adds twelve Trayo skills for common GTM workflows.

- The Trayo tools need the user to sign in. If the `trayo` MCP server is disconnected or needs
  authentication, ask the user to run `/mcp auth trayo`, sign in with their Trayo account in the
  browser, and approve a workspace. There is no API key: never ask for one or look for one in files
  or the environment.
- If the Trayo tools are not listed, the server may still be connecting. Check the tool list again
  before telling the user Trayo is not connected, and check again on every turn instead of repeating
  an earlier answer.
- Call `trayo_whoami` first. It confirms the workspace, the user, and their permissions.
- Gemini CLI lists the Trayo tools with an `mcp_trayo_` prefix, so `trayo_whoami` appears as
  `mcp_trayo_trayo_whoami`. The skills use the plain tool names.
- Find, search and research tools save nothing. Add companies with `trayo_import_accounts` and people
  with `trayo_add_people` only once the user has agreed on the set; write tools change the workspace.
