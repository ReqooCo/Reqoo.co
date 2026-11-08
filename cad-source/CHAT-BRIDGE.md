# REQOO CAD chat connection

## User flow

Open https://reqoo.co/cad/ → **Chat** → **Connect this project** → **Copy message for chat**. Paste that message in the assistant conversation, then describe the model with dimensions. Auto Apply is enabled; turn it off to review each command in CAD first. Return to the CAD tab on iPad to receive the model; background/suspended Safari tabs cannot execute the geometry kernel. Disconnect revokes access. Pairing lasts 24 hours and resumes across reloads in the same tab.

The chat assistant translates the request into structured CAD operations; the bridge itself is not an LLM and needs no OpenAI key. Native geometry is built on the device. Each command is one undoable transaction. Failed kernel builds preserve the previous document. No JavaScript, STEP uploads, or arbitrary file deletion can be submitted remotely. Project clearing and history-feature deletion are available only through the authenticated, revision-guarded document control tool.

## MCP clients

Endpoint: `https://reqoo.co/cad/mcp`. Use `Authorization: Bearer PAIRING_CODE` (hyphens and case are normalized). The browser consumer credential is separate and must never be shared. This is a stateless JSON-response Streamable HTTP endpoint for protocol `2025-06-18`; it does not offer OAuth, SSE or self-install as a ChatGPT app. A client must support bearer authentication. The existing Cloudflare connector can be used from this workspace as described below, without registering a new MCP connector.

POST JSON-RPC with `Accept: application/json, text/event-stream`. Call initialize, then tools/list. Tools:

- `cad_get_schema`: supported native parameter conventions and limits.
- `cad_get_state`: latest geometry revision, features and bounded native face/edge metadata; no meshes or imported STEP contents are shared.
- `cad_apply_features`: submit `{id,title,expectedRevision,features:[{id,type,params,inputs}],updates:[{id,params}]}`. Use the exact current revision. IDs must be unique, units mm. Input feature IDs may refer to earlier operations in the same transaction.
- `cad_edit_document`: submit `{id,title,expectedRevision,actions:[...]}` for `clear`, `delete`, `deleteBodies`, `renameFeature`, `setTitle`, or `setVisibility`. `clear` requires `{kind:"clear",confirm:true}` as the only action. `delete` requires feature IDs and optionally `cascade:true` to remove dependent history steps. `deleteBodies` creates an undoable native deletion feature and requires `{kind:"deleteBodies",ids:[bodyId],featureId:"unique_id",confirm:true}`. IDs must come from `cad_get_state.state.bodies`. This modifies only the paired project, is one native Undo step, and cannot be replayed with a different payload.
- `cad_control_workspace`: submit `{id,title,expectedRevision,control:{kind,...}}`. Supported kinds: `undo`, `redo`, `fit`, `view` (iso/top/bottom/front/back/left/right), `display` (solid, edges, wireframe, x-ray modes), `grid`, `select` (native body/sketch/face/edge references), and `clearSelection`. Read state first; control commands are standalone and execute only in the active CAD tab.
- `cad_command_status`: poll `{id}`. Only **applied** confirms geometry was committed. **queued** means the open CAD tab has not yet applied it. **failed/rejected** means no changes from that command were committed.

A completed acknowledgement publishes the new state and command result atomically, so the next command cannot observe an applied result with the old document revision. Repeated command IDs with identical data return their existing result; different data with the same ID is rejected. The browser keeps receipt markers through save/reopen and prevents duplicate execution after lost acknowledgements. Web Locks prevent duplicated tabs from consuming the same pairing concurrently.

REST equivalents: GET `/cad/bridge/state`, POST `/cad/bridge/commands`, GET `/cad/bridge/commands?id=...`, all with the pairing code as bearer. Browser-only endpoints use the separate consumer token: POST state/result/disconnect and GET poll.

## Assistant access through the connected Cloudflare app

This project's existing D1 database is `reqoo-rebuild` (`15123ddd-d63a-4033-912c-51c1f05c11c5`), account `fb9d218f75857002fe6b46964299d94c`. The Web Worker binding is `CAD_DB`. Only the `cad_bridge_*` tables are used; never query commerce/customer tables for a CAD request.

Prefer the authenticated MCP/REST endpoints where a network client is available. In this Work conversation, the Cloudflare connector can enqueue directly using its D1 query endpoint. Normalize the user's pairing code (remove hyphens, lowercase), compute SHA-256, then query **only** the matching unexpired session:

```sql
SELECT id,revision,state,last_seen FROM cad_bridge_sessions
WHERE producer_hash=? AND expires_at>?;
```

Parameters are the code hash and current epoch milliseconds. Read the schema above and prepare a command. Validate it with `validateBridgeCommand` in `src/bridge-protocol.js` before any insert. Never select all sessions to find a user. Check that revision is non-empty; if `last_seen` is old, explain that the queued command will execute when the paired CAD tab resumes.

Use D1's parameterized query endpoint `/accounts/{account_id}/d1/database/{database_id}/query`. Insert only against that session, expected revision and expiry, preserving capacity/idempotency:

```sql
INSERT OR IGNORE INTO cad_bridge_commands(session_id,id,payload,created_at)
SELECT id,?,?,? FROM cad_bridge_sessions
WHERE id=? AND revision=? AND expires_at>?
AND (SELECT count(*) FROM cad_bridge_commands WHERE session_id=? AND status='queued')<20
AND (SELECT count(*) FROM cad_bridge_commands WHERE session_id=?)<200;
```

Parameters: command ID, serialized command, now, matching session ID, expected revision, now, matching session ID twice. Read back `payload,status,result` for that exact session/command; validate an existing payload matches on retry. Do not report success until status is applied and inspect returned native volume/bounds. The browser independently validates commands and revision even for a connector insert. Never print browser tokens or unrelated session data. Only clear/delete the paired project when the user explicitly requests that destructive action. Check resulting status and feature count before reporting success.

## Deployment and QA

Migration `migrations/20261105_cad_bridge.sql` creates isolated session, command and short-lived rate-limit tables. The existing production workflow applies it before deploying `reqoo-web` with `CAD_DB`. No external secrets are embedded. Pairing hashes are stored in D1; plaintext credentials are returned only to the browser. Creation is rate limited, JSON bodies are bounded, origins are checked, statements are parameterized, sessions are isolated and expired records are cleaned when a new session starts. Server implementation is excluded from public static assets.

Run `node tests/bridge-api.mjs` (Node 24 SQLite) and `CAD_BUILD_DIR=dist node tests/bridge-ui.mjs` after building in cad-source. The UI test runs the actual Worker handler against real SQLite locally and the deployed D1/Worker through MCP on production, with the real CAD kernel in Chromium. It creates a plate with four holes, checks native volume, Undo/Redo, reload, retry deduplication, failed geometry rollback, optional review, upstream resizing, document rename, confirmed clear, remote Undo/Redo and view, rejection and revocation. Existing CAD regressions remain required.

Limits: 30 operations/command, 150 features/project, 20 pending commands, 200 commands/pairing, 48 KB command data, 24-hour pairing. Large state summaries are marked truncated. Native feature support is the existing CAD engine's support; the bridge does not add new modeling operations. Production bridge routes are served by reqoo-web at reqoo.co, not the static Pages preview.

Rollback: revert this PR to remove UI/routes/binding. The new tables are independent and can remain empty; no existing business schema is changed.

## Remote control safety boundary

The MCP interface is limited to the paired open project. It does **not** give access to local files, arbitrary JavaScript, STEP upload/import, operating-system tools, or release/deployment controls. Only allow the caller to clear or delete after the user has explicitly instructed that destructive action. Pairings expire after 24 hours and can be revoked from CAD. The browser holds the actual native Undo history; after reload, the persisted document may not retain prior Undo/Redo stacks, so those actions must report a failure rather than falsely claim success. Workspace-only controls do not mutate geometry.
