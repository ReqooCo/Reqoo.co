# R3ds functional audit — 5 November 2026

Baseline: main 387234ae. This is an evidence ledger, not a claim of full professional-CAD parity. Native geometry is authoritative; the Three.js mesh is a disposable display representation.

## Repairs in this increment

- Cache face geometry, edge geometry and bounded per-body material variants across selection repaints. Stable mesh identities survive worker structured cloning. Evict resources when snapshots leave the visible model; replace UV geometry when mapping changes.
- Avoid shader invalidation when the clipping-plane count has not changed.
- Append-only committed operations reuse the unchanged native feature prefix. Transfer native ownership only after successful construction; previews retain separate ownership. Upstream changes still rebuild the full history.
- History edits of selected-edge chamfer/fillet preserve the original edge list and do not silently default to all edges when nothing is currently selected.
- Let users choose a face-outline offset before committing; a 1 mm face can use a valid -0.1 mm offset instead of failing on a hardcoded -2 mm.
- Remove obsolete instructions to enable a multi-select switch.

## Functional coverage ledger

| Tool / function | Evidence suites | Scope / remaining gap |
|---|---|---|
| Rectangle, circle, ellipse, polygon, line/polyline, arc, spline | direct-sketch-ui, active-sketch-edit-ui, cad, acceptance | Direct sketch workflow; not every spline/arc edit permutation is covered |
| Plane picker XY/XZ/YZ; face sketch | direct-sketch-ui, workspace-reference-ui, sketch-regions-ui | Planar support; arbitrary curved-face sketch unavailable |
| Offset sketch, sketch fillet/mirror | multi-profile, active-sketch-edit-ui | Closed native contours; face-derived offsets are edited in History |
| Profile join/cut/intersection, trim region | multi-profile, multi-profile-ui | Closed coplanar region Boolean; arbitrary segment trimming unavailable |
| Construction geometry, constraints | constraints, direct-sketch-ui | Partial polyline solver; not a general all-entity constraint graph |
| Dimension editing / between sketches | smart-dimensions, smart-dimensions-ui, precision-ui | Supported coplanar relationships; general cross-plane driving dimensions incomplete |
| Box, cylinder, sphere, torus | cad, acceptance, precision-modeling | Native primitives |
| Extrude / multiple profiles / operation modes | multi-profile, multi-profile-ui, extrude-modes-ui | Native results; compatible closed profiles required |
| Offset Face | precision-modeling, precision-ui, motion-continuity-ui | Planar add/cut; no general curved-face surface extension |
| Fillet / chamfer | multi-profile-ui, cad, display-performance-ui | Native edge refs; incompatible topology changes may require repair |
| Shell, draft, hole | acceptance, precision-modeling, precision-ui | Kernel compatibility and valid dimensions required |
| Revolve, loft, sweep | cad, acceptance | Two-section loft; sweep is round-section, not arbitrary-profile parity |
| Union, subtract, intersect, split | cad, acceptance, multi-profile | Native B-rep operations; invalid combinations reject |
| Move, rotation, scale, copy, mirror | transform-ui, rotation-ui, motion-continuity-ui | Scale is uniform; not general nonuniform B-rep scaling |
| Linear/circular pattern, thread | pattern-thread, pattern-thread-ui | Current axis/vector options; cylindrical thread compatibility required |
| Align / concentric align | transform-snapping, transform-ui | Current planar/cylindrical and body alignment scope |
| Origin/axis, grid, camera, snapping | input, workspace-reference-ui, r3ds-ux-ui | Actual physical iPad/Pencil verification still needed |
| Items, visibility, isolate, history, undo/redo | product, acceptance, r3ds-ux-ui | No complete assembly/grouping system |
| Display modes / section / measure | precision-ui, workspace-reference-ui | Section is clipping, not a cut feature |
| Materials, textures, scene, PNG | visualization, visualization-ui | Real-time PBR; not path-traced rendering |
| Save/reload, STEP export/import | cad, acceptance, product | Native round trips; project size still affects rebuild time |
| Pairing bridge / route | bridge-api, bridge-ui, runtime-route | Separate integration checks; not a live user-project modeling test |
| Native append cache / failed preview / ownership | native-cache | Reuse safe prefix; upstream edits rebuild |
| Selection geometry reuse / finishing history edit | display-performance-ui | Resource identity assertions; timing is diagnostic only |

## Performance evidence

Same local Chromium touch viewport, four primitive bodies, 16 selection changes:
- baseline: 16 face-geometry instances;
- repaired: 1 face-geometry instance;
- one diagnostic run: median synchronous selection 2.7 ms → 1.5 ms. This is not an iPad frame-rate claim or a controlled broad benchmark.

Native regression verifies one appended feature rebuilds only that feature, retained shapes survive parent release, failed builds do not destroy the committed model, temporary previews do not own parent shapes, and upstream edits invalidate reuse. This reduces repeated computation; it does not remove kernel or tessellation cost for the changed body.

## Remaining priorities, not completed fixes

1. Offset Sketch now accepts a distance before committing; add a dedicated direct-drag preview as a later UX improvement.
2. Context actions follow the last selected entity in several paths. Resolve capabilities against the complete selection and explain incompatible mixed selections.
3. Coplanar profile combination needs broader in-plane basis conversion, not merely compatible frame checking.
4. Stop unnecessary idle rendering and repeated DOM projection after explicit invalidation has been tested. The current animation loop remains continuous.
5. General segment Trim, projected geometry, stronger persistent constraints and cross-plane dimensions need dedicated geometry work.
6. Confirm touch/pencil ergonomics and sustained memory/performance on a physical iPad. Browser emulation is insufficient evidence.

Release gate: build, complete browser/native regression and CI must pass. Never describe remaining rows as implemented professional-CAD parity.
