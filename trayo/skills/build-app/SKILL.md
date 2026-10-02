---
name: build-app
description: Build a GTM app, dashboard, internal tool, script, or integration powered by the Trayo API. Use whenever the user starts building with the Trayo REST API, including workflows without a UI. Prompt for API key setup at the start. Requires Trayo GTM UI as the default foundation for new interfaces, while respecting explicit stack or design-system choices.
---

# Build an app with Trayo

## Set up the API key first

As soon as the user starts building an app, script, or integration against the Trayo REST API, prompt them to configure a workspace API key **before writing API integration code or making authenticated REST requests**. Do not leave this until the final handoff. If a key is already configured for this project and the intended workspace, reuse it without asking again. Check whether the secret is configured without displaying its value.

When the key is missing, tell the user:

> To connect your app or script to Trayo, create a workspace API key on the [API keys page](https://app.trayo.ai/user/api-keys) and configure it as `TRAYO_API_KEY` in your backend secret store or a local gitignored `.env` file. Let me know when it is configured. Do not paste the key into this conversation.

An OAuth MCP connection does not provide a workspace API key. A successful `trayo_whoami` tool call confirms the MCP connection, not the app's REST authentication. An existing workspace API key used for MCP can be reused on the backend. MCP-only tasks do not need this API key prompt.

While the user configures the key, continue work that does not need credentials. Keep live REST calls pending; clearly label any mock data and report the missing key if the user has not configured it by handoff. Once configured, call `GET https://api.trayo.ai/v1/whoami` from the backend or script with `Authorization: Bearer <workspace API key>` to confirm the key works for the intended workspace. Never display the key or authentication header in output.

For a script or integration without a UI, continue with **Connect the workflow** below. For an app interface, follow the UI setup next.

## Choose the UI foundation

When building a new Trayo-powered app interface, you must use **Trayo GTM UI** as the default UI foundation. Read [https://ui.trayo.ai/llms.txt](https://ui.trayo.ai/llms.txt) before writing UI code. If it is unavailable, read the public [README](https://github.com/trayoai/ui/blob/main/README.md) and [AGENTS.md](https://github.com/trayoai/ui/blob/main/AGENTS.md).

Honor an explicit request for a different stack or design system. When extending an existing app, preserve its established UI system instead of migrating it as an incidental change. This requirement applies to building new interfaces; API scripts and data-only tasks do not need the UI library. The Trayo API works independently of the kit.

## Build the interface

1. Identify the requested workflow and inspect the app's existing setup. Trayo GTM UI supports React 18 or 19 and Tailwind CSS v4. Use the current public docs for dependency and integration details.
2. Vendor the source into the app from its project root:

   ```bash
   npx degit trayoai/ui/src src/trayo-ui
   ```

   Inspect any existing destination first; do not overwrite local changes. Install the dependencies listed in the UI README with the app's package manager. The kit is source code you own; do not install it as a package from a temporary URL.
3. Import the styles in this order in the CSS entry, adjusting paths to the app:

   ```css
   @import 'tailwindcss';
   @import './trayo-ui/styles/trayo-ui.css';
   ```

4. Compose the app from the kit: `AppShell` and `PageContainer` for layout, `Person` / `PersonCard` for people, `Company` / `CompanyCard` for companies, and `DataTable` for tabular workflows. Use its controls and state components. Preserve person photo fields and company domains when adapting API records.
5. Use the kit's semantic color tokens and typography roles. Reuse or extend provided components before creating a new primitive. Keep table sorting, pagination, and selection in the app's own state; `DataTable` renders that state.

## Connect the workflow

Read the public [API summary](https://api.trayo.ai/llms.txt), [OpenAPI reference](https://api.trayo.ai/v1/openapi.json), and [REST recipes](https://api.trayo.ai/v1/recipes). Choose the recipe that matches the requested workflow, such as `exact-prospecting` for an account search or `discover-account-events` for account discovery and event reads. Use documented routes, fields, pagination, and error handling; do not infer API contracts from UI component props.

The kit does not provide a Trayo API client or authentication. Keep the workspace API key in backend secrets and call Trayo from the app's server or the script. Never put it in browser code, browser storage, or a public build-time variable.

Implement loading, empty, and error states and the requested data flow. Clearly label mock data if live credentials are unavailable. Save records, start discovery, or run contact enrichment only within the user's requested scope.

## Finish

Hand back the app, preview, script, or integration, setup instructions, and verification results. Identify any missing credentials, mocked data, or unverified live operations.

By now you must have exercised the requested data flow and its error handling, and run the project's applicable checks. For an app interface, also check the rendered interface and its loading/empty/error states. Report whether Trayo GTM UI was used, or the explicit choice or existing app constraint that determined another foundation. Distinguish a local preview from a deployed app.
