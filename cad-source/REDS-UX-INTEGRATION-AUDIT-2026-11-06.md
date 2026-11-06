# REDS / R3ds — UX, integration and reliability audit (2026-11-06)

**Status:** implementation in draft PR; no production deployment authorized or asserted.  
**Observed:** screenshot of production `https://reqoo.co/cad/` (1666×896), while Thread is active.  
**Source:** `cad-source/`; the current application still identifies as R3ds and uses the `reqoo-cad` native project format.

## Product direction

- Shapr3D is the primary **interaction benchmark**, not a visual asset source: select a geometric entity; offer only compatible actions; operate with one on-canvas gizmo and editable dimension; expose secondary settings through a compact parameter card.
- Fusion is the benchmark for **parametric feature/timeline semantics**, not its toolbar density.
- SOLIDWORKS is the benchmark for **feature dependency rebuild, errors, sketch state and recovery**, not its full desktop UI.
- REDS graphics and controls are original. Do not claim feature parity without feature-by-feature tests.

Official references:
- Shapr3D: https://support.shapr3d.com/hc/en-us/articles/7873882619548-Adaptive-user-interface
- Shapr3D Parameter Cards (limited availability at reference date): https://support.shapr3d.com/hc/en-us/articles/31002224435356-Parameter-Cards
- Shapr3D History: https://support.shapr3d.com/hc/en-us/articles/11567903089180-History
- Autodesk Fusion Timeline: https://help.autodesk.com/cloudhelp/ENU/Fusion-Designs/files/ASM-USE-TIMELINE.htm
- SOLIDWORKS FeatureManager: https://help.solidworks.com/2026/english/SolidWorks/sldworks/c_FeatureManager_Design_Tree_Conventions.htm

## Screenshot diagnosis and cause evidence

| Finding | Evidence | Corrective contract |
|---|---|---|
| Thread choices spread across top center | `canvas-tool-gizmo.css` operationActions spans stage width; `canvas-tool-gizmo.js` mirrors each select/checkbox | One compact operation dock; keep native form as source of truth |
| Diameter/pitch/length labels scatter over cylinder | `canvas-tool-gizmo.js` projects every numeric badge into the scene and runs collision search | Parameter chips in one dock; only active gizmo + value near geometry |
| Persistent full-height left/right tool rails | `workspace-chrome.js` builds rails; `workspace-chrome.css` repeats placement rules; `r3ds.css` changes dimensions again | Compact icon rails with preserved accessible names and focus styles |
| Origin label crowds active dimension | `world-gizmos.js` projects origin/XYZ text; no active-operation ownership | Visually de-emphasize origin labels during tool operation |
| Thread feature error after upstream edit | Screenshot: "Geometry reference became ambiguous..." | Do not substitute wrong face; record failed feature in History and expose reselect/repair workflow |
| Save/Open incidents | User-reported reopen failure; `project-io.js` serialization tests alone are insufficient to validate downloaded files | Test browser download, import, legacy projects, recovery, model/history/volume equality |

## 21-area implementation verification matrix

E = source evidence; T = repository test or planned acceptance. Gaps are not claims of regression unless reproduced.

| # | Area | Evidence | Required next check |
|---:|---|---|---|
| 1 | Workflow | `main.js` startTool / workspace mode | Sketch → Solid → Modify → Save → Open, tap count and recovery |
| 2 | Layout | `workspace-chrome.js/css`, `style.css`, `r3ds.css` | Zero overlay collisions at 390/820/1180/1666 px |
| 3 | Design system | Multiple CSS layers and variable overrides | Consolidate token hierarchy; light/dark contrast checks |
| 4 | Interactions | `cad-navigation.js`, `input.mjs` | Mouse/touch/pen input ownership, physical iPad follow-up |
| 5 | Selection | `main.js` renderContext, direct-modeling target | Full mixed selection capability resolver, stable face/edge picking |
| 6 | Gizmo | `canvas-tool-gizmo.js`, `world-gizmos.js`, `rotation-gizmo.js` | Shared preview/commit/cancel state and world/local axes |
| 7 | Sketch | `sketch-stroke.js`, `constraints.js` | General trim, tangent/concentric, profile closure; one Exit |
| 8 | Solid | `engine.js`, `kernel.worker.js` | Each tool: exact B-Rep, invalid input, preview, history, undo |
| 9 | Transform | `world-gizmos.js`, `transform-frames.js` | Move/Rotate/Scale/Pattern/Align consistency |
| 10 | Camera/display | `cad-navigation.js`, `orientation-cube.js` | Axis/view persistence, fit, sensitivity, no changing model |
| 11 | History | `main.js`, `engine.js` | Edit ancestor → downstream rebuild, failure isolation |
| 12 | Project structure | `project-io.js`, engine validation | Stable feature IDs and geometric refs through file round-trip |
| 13 | Save/Open/recovery | `project-io.js`, `tests/project-io.mjs`, `tests/r3ds-ux-ui.mjs` | Browser file roundtrip and damaged autosave recovery |
| 14 | Import/export | `exports.js`, native kernel | STEP/STL/3MF/SVG/DXF per-supported-scope checksum/units |
| 15 | Status/errors | `kernel.worker.js`, runtime status handlers | Localized actionable errors, repair face/edge, never false Saved |
| 16 | Performance | `display-cache.js`, worker preview queues | p95 drag latency and GPU/memory stress benchmarks |
| 17 | Code architecture | `main.js` + UI modules | One control ownership and CSS layout authority |
| 18 | Acceptance testing | `cad-pr-validation.yml`, `tests/` | Each operation tested from UI to native result and back |
| 19 | Release/deployment | `cad-pr-validation.yml`, `cad-live-verification.yml` | Build, artifacts, source hash, live smoke, rollback |
| 20 | Manual | `README.md`, UX notes | Illustrated beginner task: rectangle → hole → fillet → export |
| 21 | Roadmap/issues | `AUDIT-FUNCTIONS.md`, parity matrix | Classify P0 UX/recovery, P1 geometry, P2 feature depth |

## Change set in this branch

1. `reds-focused-workspace.css` is an explicit final layout layer. It keeps buttons and accessible labels rather than deleting tools.
2. `canvas-tool-gizmo.js` avoids projecting and collision-packing non-active parameter badges that are now deliberately docked. The active spatial handle remains geometry-owned.
3. `tests/reds-focused-workspace-ui.mjs` covers common Box/Thread overlay and three viewport sizes; included in CAD PR CI.

This is a **first integration pass**, not a comprehensive confirmation of CAD tool correctness. Keep this branch as a draft until CI screenshots and native tests are inspected.

## Mandatory next engineering sequence

**Gate A — UI:** fix all CI failures; review screenshot artifacts from Box, Thread, Sketch, Extrude, Hole, Fillet, Chamfer, Transform and History on desktop/tablet/mobile. Check keyboard accessibility; ensure all formerly reachable settings remain reachable.

**Gate B — selection & tool ownership:** replace `getSelection().at(-1)` special cases with capability resolution over full selection. Every tool uses one input-controller contract and explicit cancel/commit ownership.

**Gate C — geometry references:** reproduce Thread ambiguous reference using edits to cylinder radius/height, measure native edge/face descriptors before/after, add non-destructive rebind with user selection, and regression test history save/reopen.

**Gate D — persistence:** reproduce reported reopen failure with real sample; confirm download/native import, backward compatibility, atomic autosave, backup and recovery; assert feature graph and exact model volumes after reopen.

**Gate E — performance:** quantify browser p50/p95 from pointer event to visible update and from preview request to displayed validated native tessellation on fixed model fixtures. Profile worker queue stalls and idle rendering.

**Gate F — release:** PR CI green, manual evidence, production hash verification, rollback path. Do not push to main or deploy on a failed gate.

## Definition of done

For every supported modeling operation: select the intended entity; contextual action is available; active gizmo is visible; dragging updates preview; numeric value is exact; Apply produces native geometry; Cancel leaves committed history untouched; edit parent preserves or marks dependent feature for repair; save/open returns same parameters and solids; desktop/tablet/mobile controls remain reachable. No fake buttons or claims of complete professional CAD parity.
