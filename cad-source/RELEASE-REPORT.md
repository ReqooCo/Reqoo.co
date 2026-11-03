# REQOO CAD integrated modeling release
PR: https://github.com/ReqooCo/Reqoo.co/pull/243
Production application: https://reqoo.co/cad/
Preview alias: https://feature-cad-professional-202.reqoo-co.pages.dev/cad/

## Scope and completed behavior
This release repairs the core modeling/release pipeline and integrates direct editing with actual CAD geometry. It is not a claim that every requested Shapr3D feature is complete. See [the feature matrix](SHAPR3D-PARITY.md) for every requested category and its evidence/boundaries.

- Select a planar face/profile/edge; show a geometry-owned arrow; drag or enter a value; compute an actual temporary OpenCascade BREP; apply/cancel without changing the committed project during preview.
- Commit face pull, extrusion and selected-edge fillet/chamfer through the shared feature history. Existing holes remain editable by centre, diameter and depth.
- Validate new face/edge references by normalized geometric descriptors and reject ambiguous references rather than silently selecting another entity. Legacy projects retain checked index references.
- Add native selected-face draft, parametric sketch offset/corner fillet/mirror, construction geometry, and parallel/perpendicular/equal/angular/midpoint polyline solver support.
- Keep Sketch/Solid workspaces, contextual tools, object/history selection, rename, visibility, isolation, safe leaf suppression/removal, undo/redo, and failed-operation rollback coherent.
- Add persisted units/precision/light-dark preferences, previous-project backup, 3MF mesh export and scoped SVG/DXF export.
- Separate pen drawing/selection from touch navigation. Palm contact during pen activity is ignored; pinch, pan and orbit have automated browser protocol tests. Physical Apple Pencil and Safari behavior remains unverified.
- Preserve native v1 projects, STEP import/export, STL, existing generator routes and presets. Generators are linked separately; automatic editable-BREP transfer is not complete.

## Root causes repaired
1. The CAD route in _web_worker.js contained an overescaped regular expression. Node rejected the entire Worker with “Invalid regular expression flags”. Pages builds could succeed while the Worker serving reqoo.co remained on old assets.
2. The Web Worker deploy previously uploaded committed output without rebuilding CAD from current source. It now builds the same source before binding assets.
3. A competing main-branch CAD asset auto-commit path could rewrite output after source releases. PR validation is now read-only; checked branch output and production source builds are explicit.
4. The global button decorator could replace geometry controls and overwrite their accessible labels. Direct modeling controls now own their markup and are excluded from decoration.
5. The previous arrow changed only a numeric value during dragging. It now requests a real temporary kernel model, displays its tessellation, and commits the same operation to history.
6. Circle rim and hole rim edges can have identical bounding-box centres. Reference matching now includes normalized curve length, so concentric edges are distinguished.
7. Source identity was not compared end-to-end. A deterministic hash covers source, dependencies and build configuration, appears in HTML/JS/version.json, and is checked on live preview/production.
8. Pen events previously reached OrbitControls before the pen-specific listener. Capturing input ownership prevents pen strokes/palm touches from rotating the camera.

## Main changed files
Geometry: src/engine.js, src/kernel.worker.js, src/topology.js, src/constraints.js.
Interaction/product: src/direct-modeling.js, src/main.js, src/style.css, src/exports.js.
Build/routing: vite.config.js, ../_web_worker.js, ../.github/workflows/deploy.yml, solid-cad.yml, cad-pr-validation.yml, cad-live-verification.yml.
Verification: tests/cad.mjs, acceptance.mjs, product.mjs, input.mjs, constraints.mjs, runtime-route.mjs.
Built output: ../cad/ is regenerated only from the verified source.

## Test evidence
The integrated source passed:
- 35 existing/native CAD regression checks, including analytic booleans, shell, revolved/lofted/swept bodies, patterns, holes, history and imports.
- 8 acceptance checks completing dimensioned circle → cylinder → touch-selected face/drag preview → pull → edited hole → individual fillet/chamfer → save/reload → STEP/STL.
- 10 product/geometry checks covering units, rename/suppression/removal, backups, 3MF, SVG/DXF, derived offset/fillet/mirror, analytic native draft, and construction rejection.
- 4 browser input checks for pen drawing, palm conflict reduction, pinch, pan and orbit.
- Solver tests for rank/conflicts/dimensional and geometric constraints; routing tests for CAD HTML/version cache headers.

These are 57 browser workflow checks plus solver/routing assertions, not a count of Shapr3D-parity features.
Evidence baseline: https://github.com/ReqooCo/Reqoo.co/actions/runs/41656532145
Screenshots and numerical result JSON files are retained as workflow artifacts.
Final source changes and the deployed application are rechecked by [CAD live preview and production verification](https://github.com/ReqooCo/Reqoo.co/actions/workflows/cad-live-verification.yml).
A release is not verified merely because Pages reports a successful build: that workflow waits for the expected source identity and executes the browser suite against the deployed URL.

## Limits and remaining work
- Physical iPad/Apple Pencil/Safari QA is not available in this execution environment. Pen/touch emulation is not hardware certification.
- Curved-face offset, arbitrary move/replace face, advanced draft, full transform gizmos, general mixed-curve constraints, tangent/concentric/symmetry, trim/extend/project, sketch pattern constraints and advanced extrusion extents remain incomplete.
- Leaf suppression/removal is supported; arbitrary dependent branch suppression is restricted.
- Geometric descriptors improve references but do not constitute a full industrial persistent-topology naming system.
- Preview rebuilds are serialized, debounced and bounded, but industrial-size assembly performance has not been certified.
- Inch entry is tested for solid/direct fields; the polyline coordinate/constraint editor explicitly uses millimetres.
- SVG/DXF export is scoped to basic circle/rectangle/polygon/polyline recipes. Derived/advanced curves are rejected rather than exported incorrectly.
- 3MF/STL are tessellated formats; STEP preserves native CAD surfaces.
