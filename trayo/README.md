# Trayo plugin

Use Trayo from Claude Code, Claude Cowork, Codex, and other clients that support remote MCP servers. The plugin bundles the Trayo MCP server with eleven job skills: onboard a new workspace, find companies showing intent, build an account list, research an account or a person, scan for a signal, monitor accounts, find stakeholders, enrich contacts, recent movers, and the core discovery loop.

Every client connects to `https://api.trayo.ai/v1/mcp`. OAuth clients can sign in with Trayo and inherit
their current workspace permissions. Workspace API keys from **Admin → API keys** remain supported.

## Connect with OAuth

Use `https://api.trayo.ai/v1/mcp` with the client's browser sign-in flow. Leave static
Authorization / X-API-Key headers and client-secret fields empty for an OAuth connection.

### Claude Code

```bash
claude mcp add --transport http trayo https://api.trayo.ai/v1/mcp
```

Run `/mcp`, select **trayo**, and authenticate in the browser.

### Cowork / Claude Desktop

Add a custom connector named **Trayo** with `https://api.trayo.ai/v1/mcp`, then use its
OAuth sign-in flow. Sign in to Trayo and approve the workspace shown on the consent page.
The connection uses your own permissions; no shared API key is needed.

### Codex

```bash
codex mcp add trayo --url https://api.trayo.ai/v1/mcp
codex mcp login trayo
```

### ChatGPT

In developer mode, add a custom MCP app with `https://api.trayo.ai/v1/mcp` and OAuth authentication.
Leave client ID and client secret blank so ChatGPT uses discovery and automatic client registration.
Connect the app, sign in to Trayo, and approve access. Your workspace's app policy may require an admin
before custom apps are available.

Call `trayo_whoami` to confirm the workspace, user and effective permissions. Choose the workspace on
the consent page when your account belongs to more than one. The connection stays pinned to that choice. Permission changes take effect on the
next request; removing membership revokes access. Workspace plan and usage limits still apply.

The packaged plugin configuration below uses an API key. Use the direct remote-server setup above
for OAuth.

## API-key plugin: Claude Code

Add the public Trayo marketplace and install the plugin:

```bash
claude plugin marketplace add trayoai/trayo-plugin
claude plugin install trayo@trayo-plugins
```

Then:

1. Run `/plugin configure trayo@trayo-plugins`.
2. Enter the key in the masked field.
3. Start a new Claude Code session.
4. Run `/mcp`, then ask Claude to call `trayo_whoami`.

The `trayo` server should be connected with 28 tools. The key is stored as sensitive plugin configuration and is never part of the plugin or conversation.

## API-key plugin: Claude Cowork and Desktop

1. Open **Customize → Plugins**.
2. Select **+ → Add marketplace → Add from repository**.
3. Add `https://github.com/trayoai/trayo-plugin`.
4. Install **Trayo** to add its eleven job skills.
5. Add a custom connector named **Trayo** with URL `https://api.trayo.ai/v1/mcp`.
6. Choose **No sign-in**, then add the request header `x-api-key` with your workspace API key as its value.
7. Start a new task and ask Claude to call `trayo_whoami`.

Your organization's plugin policy may require an administrator to approve the marketplace.

## API-key plugin: Codex

Install the marketplace and skills, then register Trayo through Codex's native MCP configuration:

```bash
codex plugin marketplace add trayoai/trayo-plugin
codex plugin add trayo@trayo-plugins
codex mcp add trayo --url https://api.trayo.ai/v1/mcp --bearer-token-env-var TRAYO_API_KEY
```

Make `TRAYO_API_KEY` available through your existing secret setup. For the Codex app, you can add `TRAYO_API_KEY=<key>` to `~/.codex/.env` yourself, set that file to owner-only access with `chmod 600 ~/.codex/.env`, and restart Codex. Do not paste the key into an agent conversation.

Check the installation with:

```bash
codex plugin list --json
codex mcp get trayo --json
```

The plugin list should show Trayo version 0.5.12. The MCP result should show the fixed URL and `TRAYO_API_KEY` as its bearer token variable. Then ask Codex to call `trayo_whoami`.

## Other MCP clients

Add a streamable HTTP MCP server with:

- URL: `https://api.trayo.ai/v1/mcp`
- Header: `X-API-Key: <key>` or `Authorization: Bearer <key>`

The eleven job skills are included for clients that support this plugin marketplace format. Call `trayo_whoami` after setup to verify the connection and key.

## Your key

The key needs the scopes listed under Notes. Keep it in the client's masked secret field or secret file; never add it to this repository or paste it into an agent conversation.

## What you get

- 28 tools, always loaded (no tool-search deferral): `trayo_whoami`, `trayo_get_workspace`, `trayo_set_workspace`, `trayo_import_accounts`, `trayo_list_accounts`, `trayo_list_signals`, `trayo_create_signal`, `trayo_run_discovery`, `trayo_get_discovery`, `trayo_list_events`, `trayo_find_companies`, `trayo_find_lookalikes`, `trayo_find_people`, `trayo_list_industries`, `trayo_search_stakeholders`, `trayo_research_company`, `trayo_research_person`, `trayo_research_person_batch`, `trayo_search_job_changes`, `trayo_add_to_list`, `trayo_list_lists`, `trayo_get_list_members`, `trayo_add_people`, `trayo_list_people`, `trayo_enrich_emails`, `trayo_enrich_phones`, `trayo_get_contacts`, `trayo_read_result`.
- Eleven skills, invoked automatically when you describe the job: `/trayo:onboard-workspace`, `/trayo:find-intent-accounts`, `/trayo:build-account-list`, `/trayo:research-account`, `/trayo:research-person`, `/trayo:scan-for-signal`, `/trayo:monitor-accounts`, `/trayo:find-stakeholders`, `/trayo:enrich-contacts`, `/trayo:recent-movers`, `/trayo:discover-signals`.
- Every skill ends the same way: what to hand back, the checkpoints that must already have happened, then three exits offered before anything is written — keep it in Trayo (a list or a signal, with the standing scan), re-run it on your own cadence (a REST recipe), or hand it off (a CSV or a file).

## What it does

- **Configure a brand-new workspace** — `/trayo:onboard-workspace`: `trayo_get_workspace` (check it isn't already set up) → `trayo_set_workspace` → `trayo_find_companies` + `trayo_import_accounts` → `trayo_create_signal` → `trayo_run_discovery`. The API-only equivalent of what the app's own onboarding does.
- **Find companies showing intent** — `/trayo:find-intent-accounts`: `trayo_list_signals` → `trayo_find_companies` (a pool that fits your ICP) → `trayo_import_accounts` (a test sample of 100) → `trayo_run_discovery` → `trayo_list_events` → rank the companies by how many different signals each hit, tune the ICP and the signals, then run on the rest of the pool.
- **Build accounts from criteria** — `/trayo:build-account-list`: `trayo_find_companies` → `trayo_import_accounts` → `trayo_add_to_list`.
- **Find, then add** — search, find and research tools save nothing, so iterate on a search until the set is right. Then add what you chose: companies with `trayo_import_accounts`, people with `trayo_add_people`. Importing an account adds no people.
- **Resume from workspace state** — `trayo_list_accounts` returns existing accounts and their reusable ids; `trayo_list_industries` returns the exact values accepted by industry filters.
- **Find companies like these** — `trayo_find_lookalikes`: send `companies` and `limit`, get ranked high/medium/low matches with reusable `companyId` values. Supply an exact company ID, or resolve by LinkedIn company URL, then website, then name. Nothing is saved unless you import the results.
- **Research an account, or a person** — `/trayo:research-account` (`trayo_research_company` + `trayo_search_stakeholders` + `trayo_list_events`) and `/trayo:research-person` (`trayo_research_person`, by professional profile or workspace person).
- **Read the signals found for an account** — `trayo_list_events` with `accountId` returns what discovery found. The events carry no significance or relevance score, so they come back unranked.
- **Scan a list of accounts for one signal** — `/trayo:scan-for-signal`: `trayo_create_signal` → `trayo_run_discovery` → `trayo_list_events`.
- **Run the whole loop end to end** — `/trayo:discover-signals`: import the companies, define the signal, run the discovery, read the events.
- Keep watching accounts with `/trayo:monitor-accounts`. Read each backfill with `discoveryRunId`. For later checks, load the saved list, run discovery for its accounts, then read each `accountId` with `signalKeys` and `discoveredSince`. An enabled schedule does not confirm current coverage for every saved account. Advance the checkpoint only after all pages and the digest succeed. Set `stakeholderCriteria` before discovery to attach people to future events.
- **Watch people for job changes** — `/trayo:recent-movers`: `trayo_search_job_changes`.
- **Find the stakeholders at a company** — `/trayo:find-stakeholders`: `trayo_search_stakeholders` or `trayo_find_people` → `trayo_add_people` → `trayo_enrich_emails` → `trayo_add_to_list`. The chain ends with people you can write to, not with a search result.
- **Look up contact details** — `/trayo:enrich-contacts`: `trayo_list_people` or `trayo_add_people` → `trayo_enrich_emails` (or `trayo_enrich_phones`) → `trayo_get_contacts` → a list or a CSV. Every lookup draws on the workspace's lookup allowance; `trayo_whoami` reports what is left of it.

## Large results

Company and people searches, lookalikes, people/list-member/contact reads,
stakeholder and job-change searches, events, and discovery results accept
`output: "auto" | "inline" | "file"`. The default is `auto`: results above
25 rows or 20 KiB become a compact preview and an expiring JSON download.
`file` always requests a download; `inline` prefers inline data up to 100 KiB.

Read `delivery` before accessing rows. For `inline`, the original result fields
remain available. For `file`, use `preview` and `metadata` for discussion, and
download `file.downloadUrl` in code for complete records or CSV conversion.
When present, `notes`, `collection`, and `applied` remain unshortened at the top
level for file and inline delivery; pages carry them inside `metadata` on the
first page.
The preview can omit rows and shorten fields. Never import only the preview
when the user asked for the whole result, and never rerun a search just to
retrieve its file. `hasMore` and `nextCursor` retain their original meaning:
a file contains this call's result/page, not all matching pages.

### “Now give me 1,000”

After an approved preview, call the same `trayo_find_companies`,
`trayo_find_people`, or `trayo_list_events` tool with unchanged filters,
`limit: 1000`, and `output: "file"`. Omit cursor for a total including the preview.
Keep sort and people `perCompany` unchanged. For events and existing attached
stakeholders, keep `expand: "people,signals"`.

The call collects up to 1,000 records and returns a preview plus
`file.downloadUrl`. Download and process the JSON or convert to CSV in code.
Check actual `rowCount`, top-level `collection.stopReason`, and `hasMore`.
For `delivery: "pages"`, read `metadata.collection.stopReason` on the first page.
If a time or size limit stops the call early, use `nextCursor` with the same
filters and remaining count, then combine and deduplicate the files in code.
There are no export jobs or polling tools.

Sentence searches and lookalikes keep their existing single-page limits.
First preview equivalent exact filters before requesting a larger company or people result;
never drop a semantic condition just to reach a larger count. Data can change
between the original preview and export.

## What it does not do

Market research. Outbound, CRM push and routing — anything that acts on what you found. Alerts are polling, not push: monitoring re-reads on the schedule you run it on, nothing arrives on its own, and no schedule lives inside Trayo. Between your checks, Trayo scans your accounts on its own — `trayo_whoami` reports whether your workspace is covered at all. For an output beyond a list — a CSV, a team-chat digest, a push into your CRM — the skills will help you write a script against the REST API these tools wrap.

## Notes

- The key needs the scopes of the routes the tools wrap: `accounts:read`, `accounts:write`, `people:read`, `people:write`, `people:enrich_email`, `people:enrich_phone`, `settings:read`, `settings:write`, `events:read`, `events:write`, `research:trigger`. The two enrichment scopes are separate on purpose: a key can be allowed to find email addresses and refused phone numbers.
- Full API reference: [openapi.json](https://api.trayo.ai/v1/openapi.json), with [llms.txt](https://api.trayo.ai/llms.txt) as the agent-facing summary.
