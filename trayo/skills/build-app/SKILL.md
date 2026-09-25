---
name: build-app
description: Build a GTM app, dashboard, or internal tool powered by Trayo. Use when the user asks to build an app with Trayo, create a prospecting dashboard, or turn a Trayo workflow into an interface. Requires Trayo GTM UI as the default foundation for new interfaces, while respecting explicit stack or design-system choices.
---

# Build an app with Trayo

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

Read the public [API summary](https://api.trayo.ai/llms.txt), [OpenAPI reference](https://api.trayo.ai/v1/openapi.json), and [REST recipes](https://api.trayo.ai/v1/recipes). Choose the recipe that matches the requested workflow, such as `exact-prospecting` for an account search or `monitor-accounts` for signal monitoring. Use documented routes, fields, pagination, and error handling; do not infer API contracts from UI component props.

The kit does not provide a Trayo API client or authentication. Keep the workspace API key in backend secrets and call Trayo from the app's server. Never put it in browser code, browser storage, or a public build-time variable. An OAuth MCP connection does not provide a workspace API key; an existing MCP workspace API key can be reused on the app's backend.

Implement loading, empty, and error states and the requested data flow. Clearly label mock data if live credentials are unavailable. Save records, start discovery, or run contact enrichment only within the user's requested scope.

## Finish

Hand back the app or preview, setup instructions, and verification results. Identify any missing credentials, mocked data, or unverified live operations.

By now you must have checked the rendered interface, exercised the requested data flow and its loading/empty/error states, and run the app's applicable checks. Report whether Trayo GTM UI was used, or the explicit choice or existing app constraint that determined another foundation. Distinguish a local preview from a deployed app.
