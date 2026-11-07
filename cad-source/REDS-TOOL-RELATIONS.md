# REDS tool relationships and Shapr3D UI findings

Reference date: 2026-11-07. Baseline: 08d0973 (all exact-head CAD and deployed Draft checks passed).

## Interaction rules

| State | Visible controls | Next action |
|---|---|---|
| Draw | Shape-specific start options, exact dimensions when relevant, Exit sketch | Draw, Select or edit tool |
| Select | Selected geometry dimensions and suitable tools | Trim / Offset / Profile / Exit sketch |
| Trim | One shared sketch bar, Done, Exit sketch | Tap supported segment; Done returns to Select |
| Offset / Profile | One edit HUD, Apply/Close, Exit sketch | Apply or Close returns to Select |
| Solid | Tools for selected body/face/edge | Native operation, Undo/Redo or Save/Open |

Switching to an edit state clears old snap feedback, hides drawing start/rectangle controls and closes the previous tool HUD. Ending a tool does not implicitly resume drawing or exit the sketch. Exiting Sketch commits the session through the existing native workflow.

## Verified boundaries, not parity claims

- Trim now records a native source-preserving history operation for all planar curve types, including spline/ellipse boundaries and derived/native outlines. The 25-pair sample matrix and browser regressions cover the reported curve failures; normalized references after upstream size edits and all possible topologies remain incomplete.
- Offset Chain now joins endpoint-connected source curves across multiple profiles on the same plane, including analytic lines/arcs. Disconnected selected profiles offset as separate groups in one history transaction. Branching/ambiguous chains reject rather than guess. Closed derived native chains can be offset repeatedly.
- Linked planar face projection follows upstream native geometry; arbitrary editable linked projection remains incomplete.
- Trim rejects dependencies or constraints when it cannot preserve them. No silent destructive recovery.
- Dimensions near symmetric crossings can obscure pointer targets; layout/selection needs further UX work.
- Touch browser coverage does not constitute physical iPad/Pencil validation.

## Primary references

- Adaptive selection tools: https://support.shapr3d.com/hc/en-us/articles/7873882619548-Adaptive-user-interface
- Fixed versus adaptive groups and efficient icons: https://www.shapr3d.com/content-library/behind-the-shapr3d-user-interface-refresh
- Trim: https://support.shapr3d.com/hc/en-us/articles/7874324658204-Trim
- Constraint/dimension visibility: https://support.shapr3d.com/hc/en-us/articles/7394385784476-Constraint-Settings

Shapr3D documents blank-grid click or Escape to complete Trim. REDS currently keeps Trim active after an empty-grid tap; this deliberate existing behavior remains a difference to evaluate separately.
