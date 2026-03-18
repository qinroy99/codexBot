# Architecture

## Goal

Add an IM bridge capability to Codex App for Windows without tightly coupling the desktop host to the bridge runtime.

The design keeps three responsibilities separate:

- Codex remains the agent runtime and execution engine.
- The bridge sidecar handles IM adapters, thread binding, audit, permissions, and recovery.
- The Windows host handles local settings, status surfaces, tray integration, and side panels.

This follows the layering idea used by `cc-connect`, while reusing the existing `claude-to-im`, `CodexProvider`, and `ui-console` foundation already in this repo.

## Target Layers

### `bridge-service/`

This is the long-term home for the bridge service itself.

Planned subareas:

- `api/`
  - management API
  - panel API
  - host integration API
- `core/`
  - thread binding
  - audit
  - permission gate
  - retry and repair flows
- `runtime/`
  - Codex runtime
  - Claude runtime
  - resume and execution policies
- `store/`
  - config
  - bindings
  - sessions
  - messages
  - audit

Current first step:

- `api/thread-side-panel.mjs`

### `shared/`

Shared contracts that can be reused by UI, host, and service code.

Examples:

- route constants
- query parameter rules
- response shapes
- shared limit and filter rules

Current first step:

- `types/bridge-contracts.mjs`

### `windows-host/`

Host-facing UI and integration points for Codex Windows.

Planned areas:

- side panel
- local host shell
- tray entry
- desktop packaging integration

Current first step:

- `im-side-panel/`

### `vendor/Claude-to-IM-skill/`

This remains the active runtime source in the short term.

Important current entry points:

- `src/main.ts`
- `src/codex-provider.ts`
- `scripts/daemon.ps1`

As the service boundary gets stronger, reusable logic should move into `bridge-service/` so that UI, scripts, and vendor code are less tightly coupled.

## Current Runtime Model

Today the local control surface is still `ui-console/server.mjs`.

It currently does four things:

- reads `C:\Users\Administrator\.claude-to-im\config.env`
- reads runtime files such as `status.json`, `bindings.json`, `audit.json`, `sessions.json`, and `messages`
- calls `scripts/bridge-control.ps1` to manage the bridge lifecycle
- exposes `/api/bridge/*` endpoints for the main console and side panel

The new side panel related entry points are:

- `/im-side-panel/`
- `/api/bridge/thread-panel/bootstrap`
- `/api/bridge/thread-panel/thread`
- `/shared/types/bridge-contracts.mjs`

## Recommended Implementation Order

### Phase 1

Stabilize boundaries without changing the underlying runtime behavior.

- extract shared contracts
- connect the host panel to stable APIs
- add architecture documentation

### Phase 2

Move API logic out of `ui-console/server.mjs` into `bridge-service/`.

- thread query
- thread detail
- audit export
- health and doctor helpers

### Phase 3

Extract runtime and storage services.

- move Codex runtime policies behind a runtime service boundary
- move config, audit, and session reads behind store services

### Phase 4

Attach a real Windows host.

- pywebview, Tauri, or Electron shell
- tray integration
- auto start
- local secret protection

## Design Rules

- preserve compatibility first, replace internals second
- extract contracts before extracting implementations
- UI should consume APIs instead of reading bridge files directly
- new Windows host surfaces should prefer the shared contracts and side panel endpoints
