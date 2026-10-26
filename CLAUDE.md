# InPost Global API — n8n community node

This repo builds an n8n community node package for the InPost Global API
(https://developers.inpost-group.com). Read `SPEC-INPOST.md` before you
implement or change anything: it holds the API map, the node design and the
build milestones (M1–M6).

n8n's general rules for AI agents building community nodes come from the
official `@n8n/node-cli` template (n8n@2.45.0) and are imported here:
@AGENTS.md

Follow the context-specific docs in `.agents/` that AGENTS.md points to.
Where this file and AGENTS.md differ, this file wins.

## How to work with me

- I am not a software engineer. Talk to me in Polish, in plain words, and
  explain a technical term the first time you use it.
- I work on Windows, in the VS Code terminal (PowerShell). Give me commands
  that work there.
- Code, node UI texts (display names, descriptions, hints, error messages) and
  the README are in English only — n8n verification requires it.
- Work one milestone at a time. Before coding a milestone, show a short plan
  and wait for my OK.
- After every change run `npm run lint` and `npm run build` and fix every
  error before you say a task is done.
- At the end of each milestone tell me exactly how to test it in n8n: what to
  click, what to type and what result to expect.
- Never put real secrets (client ID, client secret, tokens) in any file.
  Credentials live only in n8n's credentials screen.
- Never run `npm publish` or `npm run release` unless I ask for it explicitly.
- If an OpenAPI spec and these files disagree, the spec wins — tell me what
  you found and update `SPEC-INPOST.md`.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs dependencies; run it first when `node_modules` is missing and after `package.json` changes. Needs Node.js 24, the newest 24.x (I switch versions with nvm-windows): n8n requires 24+, `release-it` 21 needs 24.15+, and the `isolated-vm` dependency ships ready-made binaries only for specific Node versions (7.0.1: 24 and 26), so other versions try to compile it and fail without Visual Studio build tools |
| `npm run dev` | Starts a local n8n with this node at http://localhost:5678 (from n8n 3.0 it runs n8n in a container, so Docker or Podman must be running) |
| `npm run lint` | n8n linter |
| `npm run lint:fix` | Fixes what the linter can fix automatically |
| `npm run build` | Compiles to `dist/` |
| `npm run release` | Version bump, changelog, tag and push; GitHub Actions then publishes to npm (only when I ask) |

## Source of truth: the OpenAPI specs

Download these once into `docs/openapi/` and read them instead of guessing.
The portal pages render the specs in the browser, so a plain fetch of a portal
page shows only "Loading...". `docs/openapi/` is already in `.gitignore`: the
specs belong to InPost and stay out of our public repo.

- https://developers.inpost-group.com/openapi/points-v1.json
- https://developers.inpost-group.com/openapi/tracking-v1.json
- https://developers.inpost-group.com/openapi/shipping-v32.json
- https://developers.inpost-group.com/openapi/one-time-pickups-v3.json

## n8n rules (needed for verification)

- The project starts from n8n's official template
  https://github.com/n8n-io/n8n-nodes-starter (commit 6240cb4). Its
  `devDependencies`, `AGENTS.md` and `.agents/` were updated to match the
  current `@n8n/node-cli` template (n8n@2.45.0). Every script runs through
  `@n8n/node-cli` (`n8n-node`). Keep its structure, scripts and
  `.github/workflows/publish.yml`. License: MIT.
- `nodes/GithubIssues` is the template's declarative-style reference
  implementation. Study it before you build the InPost node, then remove it
  together with `nodes/Example` (milestone M1).
- The remote setup could not write the template's `.github` and `.vscode`
  files. In M1 recreate them: run `npm run release -- --init-workflow` (it
  creates `.github/workflows/publish.yml`), then add
  `.github/workflows/ci.yml` (lint and build on every push to `main`) and
  `.vscode/extensions.json` (recommends ESLint, EditorConfig and Prettier),
  copying both from https://github.com/n8n-io/n8n-nodes-starter.
- TypeScript. The action node uses the declarative style (`requestDefaults` +
  `routing`, no `execute()` method). Use `preSend` for nested request bodies
  and `postReceive` for output shaping and binary labels. A trigger node, if
  added later, uses the programmatic style.
- No runtime dependencies: nothing in `dependencies`. No `process.env`, no file
  system access — all data comes from node parameters and credentials.
- One service per package: InPost only.
- UX guidelines:
  https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines.md
  - Title Case for the node name and parameter display names; Sentence case for
    action names, descriptions, hints and dropdown descriptions.
  - Secrets are password fields. Boolean descriptions start with "Whether".
  - Error messages say what happened and how to fix it, without the words
    "error", "problem", "failure" or "mistake".
  - An output with more than 10 fields gets a `Simplify` toggle.
  - Use InPost's own wording from its user interface, not API jargon.
- Verification guidelines:
  https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines.md
- Before publishing, `npm run lint` must be clean. After publishing,
  `npx @n8n/scan-community-package <package-name>` must pass.

## InPost API essentials

- Auth: OAuth 2.1 with the client credentials grant. Token URLs:
  - stage: `https://stage-api.inpost-group.com/oauth2/token`
  - production: `https://api.inpost-group.com/oauth2/token`
- Send the client ID and secret either in the form body or as HTTP Basic —
  exactly one method per request. Tokens last about 10 minutes.
- API base URLs: stage `https://stage-api.inpost-group.com`, production
  `https://api.inpost-group.com`.
- Scopes: `api:points:read`, `api:tracking:read`, `api:shipments:read`,
  `api:shipments:write`, `api:one-time-pickups:read`,
  `api:one-time-pickups:write`.
- Versions live in the path: `/location/v1`, `/tracking/v1`, `/shipping/v2`,
  `/pickups/v1`.
- Shipping and pickup endpoints need the merchant's `organizationId` in the
  path; it is stored in the credentials.
- Spec inconsistencies to check on stage before relying on them: the pickups
  spec lists the token URL `https://account.inpost-group.com/oauth2/token`,
  and the shipping spec lists only the production server.

## Definition of done for each milestone

1. `npm run lint` and `npm run build` pass.
2. I have tested it in `npm run dev` against the stage environment.
3. The README covers the new operations (in English).
4. The work is committed with a clear message.
