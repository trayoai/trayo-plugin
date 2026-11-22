# Trayo plugin

Use Trayo from Claude Code, Claude Cowork, Codex, Cursor, Gemini CLI, and other clients that support remote MCP servers. The plugin bundles the Trayo MCP server with skills for common GTM work: build account lists from built-in lists, an ideal customer profile or lookalikes, match company names, find and qualify people, map buying committees, look up emails and phones, research accounts, read LinkedIn posts, find buying signals, track champions and recent movers, monitor accounts on a schedule, and build apps on the Trayo API.

You sign in with your Trayo account in the browser the first time a Trayo tool is used. The connection uses your own workspace permissions. There is no API key to paste, and the plugin stores no credentials.

## What the plugin runs, sends, and fetches

- **One remote MCP server.** The plugin adds a server named `trayo` at `https://api.trayo.ai/v2/mcp` (streamable HTTP over HTTPS). Claude clients read it from `.mcp.json`, Cursor from `mcp.json`, and Gemini CLI from `gemini-extension.json`; all three declare the same server with no credentials. It runs no local code: no hooks, no scripts, and no local server process.
- **OAuth sign-in.** The server requires OAuth 2.0 authorization. Your client opens a Trayo sign-in page in your browser, you approve access to a workspace, and the client stores and refreshes the access token. The plugin itself contains no key, token, or secret.
- **What is sent to Trayo.** Each tool call sends its arguments to the Trayo MCP server over HTTPS, for example company names, websites and professional profile URLs, search criteria, signal definitions, and the ids of companies, people, lists and discoveries. Write tools change your workspace (creating and changing lists, changing workspace settings, starting or canceling a discovery). Research, discovery and contact lookups use your workspace's Trayo credits.
- **What comes back.** Company, people, post, contact and discovery data from Trayo's business data and public professional sources, and from your workspace. Long results come back one page at a time.
- **Skills.** Skill instruction files that tell the agent which Trayo tools to call and in what order. `/trayo:build-app` points the agent to Trayo's public API documentation at [https://api.trayo.ai/v2/docs](https://api.trayo.ai/v2/docs), reads the public Trayo GTM UI guide at [https://ui.trayo.ai](https://ui.trayo.ai) and, when you ask it to build an app, copies the public `trayoai/ui` source from GitHub into your project with `npx degit`.
- **Gemini CLI context.** In Gemini CLI, the extension also loads a short `GEMINI.md` into each session: what Trayo is, how to sign in, and to call `trayo_v2_get_workspace` first.

## Connect

Every client connects to `https://api.trayo.ai/v2/mcp` and signs in with Trayo over OAuth. Leave static
Authorization / X-API-Key headers and client-secret fields empty for an OAuth connection. When your account
belongs to more than one workspace, choose one on the consent page; the connection stays pinned to that choice.

### Upgrading from 0.6

Version 1.0.0 moves the plugin from `https://api.trayo.ai/v1/mcp` to `https://api.trayo.ai/v2/mcp`. The v2
tools are named `trayo_v2_*`, and the skills are new. After you update, your client may ask you to sign in to
Trayo again for the new server.

### Claude Code

Add the public Trayo marketplace and install the plugin:

```bash
claude plugin marketplace add trayoai/trayo-plugin
claude plugin install trayo@trayo-plugins
```

Then:

1. Start a new Claude Code session.
2. Ask for something that uses Trayo. The first time Claude needs a Trayo tool, sign in with your Trayo account in the browser and approve access.
3. To sign in ahead of time, or if Trayo shows as needing authentication, run `/mcp`, select the Trayo server, and choose **Authenticate**.
4. Ask Claude to call `trayo_v2_get_workspace`.

The `trayo` server should show as connected. Claude Code connects only once to servers that share a
URL, so if you also added Trayo as a connector in Claude, you get one set of Trayo tools.

### Claude Code with `--strict-mcp-config`

Claude Code's strict flag loads MCP servers only from `--mcp-config`. It ignores the server bundled
with the installed plugin, so installing the plugin by itself will not connect Trayo in that session.
Add Trayo to the JSON file you pass to `--mcp-config` (or merge this entry into your existing file).
It is the same entry the plugin bundles:

```json
{
  "mcpServers": {
    "trayo": {
      "type": "http",
      "url": "https://api.trayo.ai/v2/mcp",
      "alwaysLoad": true,
      "timeout": 120000
    }
  }
}
```

Run `claude --strict-mcp-config --mcp-config /path/to/mcp.json`, then run `/mcp`, select **trayo**,
sign in in the browser, and call `trayo_v2_get_workspace`. A non-interactive `-p` run cannot open the browser
sign-in, so complete it first in an interactive session started with the same flags. In a
`-p --output-format stream-json` run, check the `system/init` event's `mcp_servers` and
`mcp_server_errors`. If your existing strict config lists other servers, keep them in the same file.
If `/mcp` shows Trayo as disabled, re-enable it there; the strict flag does not reset a disabled-server choice.

### Claude Cowork and Claude Desktop

1. Open **Customize → Plugins**.
2. Select **+ → Add marketplace → Add from repository**.
3. Add `https://github.com/trayoai/trayo-plugin`.
4. Install **Trayo** to add its skills.
5. If Trayo is not connected yet, add a custom connector named **Trayo** with URL `https://api.trayo.ai/v2/mcp` and use its sign-in flow.
6. Sign in to Trayo and approve the workspace shown on the consent page.
7. Start a new task and ask Claude to call `trayo_v2_get_workspace`.

Your organization's plugin policy may require an administrator to approve the marketplace.

### Codex

Install the marketplace and the plugin, which registers the Trayo MCP server, then sign in:

```bash
codex plugin marketplace add trayoai/trayo-plugin
codex plugin add trayo@trayo-plugins
codex mcp login trayo
```

`codex mcp login` opens the Trayo sign-in in your browser. Restart Codex, then check the installation with:

```bash
codex plugin list --json
codex mcp get trayo --json
```

The plugin list should show Trayo version 1.0.0. The MCP result should show the fixed URL. Then ask Codex to call `trayo_v2_get_workspace`.

### Cursor

Once Trayo is listed in the [Cursor Marketplace](https://cursor.com/marketplace), install it from
**Customize** in Cursor. The plugin adds the Trayo MCP server and the skills, and Cursor asks
you to sign in with your Trayo account in the browser.

Until then, add the server to `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project) and sign in
when Cursor asks:

```json
{
  "mcpServers": {
    "trayo": { "url": "https://api.trayo.ai/v2/mcp" }
  }
}
```

In Cursor, run a skill as `/buying-signals` and so on, without the `trayo:` prefix. Then ask the
agent to call `trayo_v2_get_workspace`.

### Gemini CLI

Install the extension:

```bash
gemini extensions install https://github.com/trayoai/trayo-plugin
```

Then:

1. Start Gemini CLI. Until you sign in, it lists the `trayo` server as disconnected and says it requires authentication.
2. Run `/mcp auth trayo`, sign in with your Trayo account in the browser, and approve the workspace. There is no API key to paste.
3. Ask Gemini to call `trayo_v2_get_workspace`.

Gemini CLI installs the extension from this repository's latest GitHub release. It adds the `trayo` server, the
skills, and the `GEMINI.md` context file. Gemini activates a skill when your request matches it and asks
before it does; `/skills list` shows them. Gemini CLI names the Trayo tools with an `mcp_trayo_` prefix, for example
`mcp_trayo_trayo_v2_get_workspace`. Run `gemini extensions update trayo` to pick up a newer release.

### ChatGPT

In developer mode, add a custom MCP app with `https://api.trayo.ai/v2/mcp` and OAuth authentication.
Leave client ID and client secret blank so ChatGPT uses discovery and automatic client registration.
Connect the app, sign in to Trayo, and approve access. Your workspace's app policy may require an admin
before custom apps are available.

### Other MCP clients

Add a streamable HTTP MCP server with URL `https://api.trayo.ai/v2/mcp` and OAuth authentication. Leave
client ID and client secret blank; the server supports discovery and automatic client registration.

A client that cannot complete a browser sign-in can use a workspace API key from the
[API keys page](https://app.trayo.ai/user/api-keys) instead, entered in the client's own `X-API-Key` header
field. Keep the key in the client's masked secret field or secret store; never add it to this repository or
paste it into an agent conversation. The key needs the scopes listed under Notes.

The skills are included for clients that support this plugin marketplace format. Call
`trayo_v2_get_workspace` after setup to verify the connection.

## Permissions

Over OAuth, the tools act with your own Trayo permissions in the workspace you approved. Permission
changes take effect on the next request; removing your membership revokes access. Workspace plan, credit
and rate limits still apply.

## What you get

- The Trayo v2 tools, always loaded (no tool-search deferral). Read-only: `trayo_v2_get_workspace`,
  `trayo_v2_resolve_companies`, `trayo_v2_search_companies`, `trayo_v2_research_companies`,
  `trayo_v2_get_vendor_customers`, `trayo_v2_resolve_people`, `trayo_v2_lookup_workspace_person`,
  `trayo_v2_search_people`, `trayo_v2_research_people`, `trayo_v2_search_posts`, `trayo_v2_resolve_posts`,
  `trayo_v2_get_post_engagers`, `trayo_v2_get_contact_lookup`, `trayo_v2_preview_discovery`,
  `trayo_v2_get_discovery`, `trayo_v2_list_discoveries`, `trayo_v2_draft_signal`, `trayo_v2_score`,
  `trayo_v2_list_lists`, `trayo_v2_get_list`, `trayo_v2_list_items`. Change data or start work:
  `trayo_v2_lookup_contacts`, `trayo_v2_start_discovery`, `trayo_v2_cancel_discovery`,
  `trayo_v2_create_list`, `trayo_v2_update_list`, `trayo_v2_delete_list`, `trayo_v2_add_list_items`,
  `trayo_v2_remove_list_items`, `trayo_v2_update_workspace`.
- Skills, invoked automatically when you describe the job, or by name:

| Skill | What it does | Tools |
|---|---|---|
| `/trayo:builtin-company-lists` | Use a built-in company list | `trayo_v2_list_lists`, `trayo_v2_get_list`, `trayo_v2_list_items`, `trayo_v2_search_companies`, `trayo_v2_create_list` |
| `/trayo:names-to-ids` | Turn a spreadsheet of companies into Trayo ids | `trayo_v2_resolve_companies`, `trayo_v2_create_list` |
| `/trayo:icp-account-list` | Build a company list from an ICP, then add similar companies | `trayo_v2_search_companies`, `trayo_v2_create_list`, `trayo_v2_add_list_items` |
| `/trayo:similar-companies` | Find companies similar to your best customers | `trayo_v2_resolve_companies`, `trayo_v2_search_companies`, `trayo_v2_create_list` |
| `/trayo:buying-signals` | Find buying signals at your companies | `trayo_v2_resolve_companies`, `trayo_v2_draft_signal`, `trayo_v2_start_discovery`, `trayo_v2_get_discovery` |
| `/trayo:list-then-discover` | Build a list with search, then watch it for signals | `trayo_v2_search_companies`, `trayo_v2_create_list`, `trayo_v2_start_discovery`, `trayo_v2_get_discovery` |
| `/trayo:technology-market` | Find new accounts that use a technology | `trayo_v2_preview_discovery`, `trayo_v2_start_discovery`, `trayo_v2_get_discovery` |
| `/trayo:monitor-accounts` | Watch your companies for new signals on a schedule | `trayo_v2_resolve_companies`, `trayo_v2_start_discovery`, `trayo_v2_get_discovery`, `trayo_v2_list_discoveries` |
| `/trayo:track-champions` | Find out when your champions move to a new company | `trayo_v2_resolve_people`, `trayo_v2_create_list`, `trayo_v2_start_discovery`, `trayo_v2_get_discovery`, `trayo_v2_search_people` |
| `/trayo:discover-account-posts` | Find posts that match signals at your accounts | `trayo_v2_start_discovery`, `trayo_v2_get_discovery` |
| `/trayo:account-posts` | Read what people at your companies post on LinkedIn | `trayo_v2_search_posts`, `trayo_v2_lookup_contacts` |
| `/trayo:posts-to-people` | Find the people behind LinkedIn posts, from their URLs or their words | `trayo_v2_resolve_posts`, `trayo_v2_search_posts`, `trayo_v2_search_people` |
| `/trayo:qualify-inbound` | Qualify inbound companies and people against your rules | `trayo_v2_resolve_companies`, `trayo_v2_search_companies`, `trayo_v2_resolve_people`, `trayo_v2_search_people` |
| `/trayo:people-at-accounts` | Find the right people at your companies, then qualify them | `trayo_v2_search_people`, `trayo_v2_create_list` |
| `/trayo:buying-committee` | Map the buying committee at a few companies | `trayo_v2_search_people` |
| `/trayo:recent-movers` | Find people who started a new role after working somewhere that matters | `trayo_v2_search_people` |
| `/trayo:contacts-at-accounts` | Get emails and phones for the right people at your companies | `trayo_v2_search_people`, `trayo_v2_lookup_contacts`, `trayo_v2_get_contact_lookup` |
| `/trayo:research-accounts` | Get an overview of companies and people before outreach | `trayo_v2_research_companies`, `trayo_v2_research_people` |
| `/trayo:build-app` | Build an app, script or integration on the Trayo REST API | Trayo API v2 and Trayo GTM UI |

The same workflows are available from the server as MCP prompts and as resources under
`trayo://v2/workflows`, for clients that use those instead of skills.

## How the tools behave

- **Start with the workspace.** `trayo_v2_get_workspace` holds what the workspace sells, its stakeholders,
  its ideal customer profile and its saved signals. Research, signal drafts and discoveries use that seller
  when a call does not send one.
- **Follow `next`.** Each answer lists suggested follow-up calls in `next`, with their arguments and an
  `afterSeconds` wait. Send them unchanged to keep the search's constraints. An empty `next` means nothing
  is left to read.
- **Discoveries wait inside the call.** `trayo_v2_get_discovery` takes `waitSeconds`, so the agent waits for
  new results instead of polling. Trayo keeps discoveries and their results for 30 days.
- **Coverage is reported.** Answers carry `notes`, `errors` and `unresolved`. Trayo does not hold data on
  every company or person, and it says so when it has no data of the kind you asked for.

## Build apps with Trayo

Use `/trayo:build-app` when building a GTM app, dashboard, internal tool, REST script, or integration powered by Trayo. At build start, the agent must prompt for API key setup if this project does not already have a workspace API key configured: create one on the [API keys page](https://app.trayo.ai/user/api-keys), then configure `TRAYO_API_KEY` in the backend secret store or a local gitignored `.env` file. Do not paste it into the conversation. OAuth MCP sign-in does not supply this key. The agent can continue work that does not need credentials while you configure it, and confirms REST authentication with a backend or script call to `GET /v2/workspace` before live API work.

**New app interfaces must use [Trayo GTM UI](https://ui.trayo.ai) as their default UI foundation.** Read [its agent guide](https://ui.trayo.ai/llms.txt) before writing UI code; if unavailable, read the public [README](https://github.com/trayoai/ui/blob/main/README.md) and [agent instructions](https://github.com/trayoai/ui/blob/main/AGENTS.md). Honor an explicit request for another stack or design system, and preserve the established system when extending an existing app. Scripts and integrations without a UI skip these interface steps.

The skill covers source vendoring, the provided people and company components, app layout, tables, and API integration with the [v2 recipes](https://api.trayo.ai/v2/recipes). Keep API keys in the app's backend. The UI kit provides presentation components, not API authentication or a data client; the Trayo API works independently of it.

## What it does not do

Trayo does not send email or messages, and does not change your CRM. Each discovery starts with an explicit
tool call; connecting MCP or saving signals does not start future runs. For repeated checks, schedule a job in
a system you control, as `/trayo:monitor-accounts` describes, and keep the API key on the job's backend.

## Notes

- A workspace API key used instead of OAuth needs the scopes of the tools it calls: `companies:read`,
  `people:read`, `lists:read`, `lists:write`, `discoveries:read`, `discoveries:run`, `contacts:read`,
  `research:run`, `workspace:read` and `workspace:write`. [Get started](https://api.trayo.ai/v2/docs/getting-started.md)
  lists which operations need each one.
- Full API reference: [API v2 docs](https://api.trayo.ai/v2/docs), [openapi.json](https://api.trayo.ai/v2/openapi.json),
  with [llms.txt](https://api.trayo.ai/v2/llms.txt) as the agent-facing summary. [MCP guide](https://api.trayo.ai/v2/docs/mcp.md).
