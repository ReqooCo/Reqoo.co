# Reqoo CAD — Shapr3D manual-driven functional parity

Reference: https://support.shapr3d.com/hc/en-us/articles/9760033847964-Shapr3D-Manual
This is a functional specification, not a claim of feature parity. Do not copy proprietary assets or branding.

## Selection and modeling interaction
- Single 3D canvas; select sketch profiles, curves, points, faces, edges, and bodies independently.
- Contextual tool palette; direct gizmos; in-canvas numerical labels; multi-select and overlapping-geometry picker.
- Apple Pencil drag-to-draw and drag-to-edit; touch gestures for orbit, pan and zoom; reliable hit testing.
- Tool state: select geometry → adjust with arrow/handle or type exact dimensions → preview result → commit/cancel → editable history.

## Sketch
- Line, auto line/arc, arc, spline, rectangle variants, circle variants, ellipse, polygon, offset edge, trim, extend, construction geometry, sketch patterns, move/rotate/copy, text.
- Dimensions: line length, angle, diameter, radius, width, height, position; tap labels to edit.
- Constraints: coincident, horizontal/vertical, parallel, perpendicular, tangent, concentric, equal, midpoint, symmetry, lock, construction; automatic constraints and conflict detection.
- Closed-profile detection including nested loops/holes, sketch on face, projection, snapping and sketch-plane editing.

## Solid modeling
- Extrude: face or sketch, new/add/subtract/intersect, one-sided/symmetric, to object/through all, draft angle, history-editable.
- Offset Face: select one/multiple faces, normal arrow, signed distance, live preview and edit.
- Chamfer/Fillet: edge selection, interactive radius/distance, multi-edge, edge chains, history editing.
- Hole, Shell, Loft, Sweep, Revolve, Union, Subtract, Intersect, Split Body, Replace Face, Offset Edge 3D, Project, Wrap/Emboss, Fill.
- Direct face editing must distinguish offset/pull, extrude, and face scaling/taper; do not substitute uniform body scale for face resize.

## Transform and construct
- Move/Rotate gizmo with local/global axes, translate, copy, scale (uniform/non-uniform), mirror, align, linear/circular pattern, rotate around axis.
- Construction planes and axes; reposition and edit.
- Items visibility, isolation, section view, measure, views, snapping.

## Parametric history and data
- Every feature has stable inputs, references and editable parameters; preserve downstream dependencies and flag broken references.
- Undo/redo, STEP import/export, STL export, local backup, autosave, units.
- Add explicit tests for numerical accuracy, topology, orientation, sketch-on-face, edge selection, booleans, history edits and touch interactions.

## Current status
Partially implemented: sketch primitives, basic dimensions, some constraints, body tools, face pull arrow, edge fillet/chamfer, history and STEP/STL.
Not yet verified as Shapr3D-equivalent: full constraint engine, true in-canvas live solid preview, complete gizmo suite, arbitrary face resizing/taper, all sketch variants, full history dependency editing, Apple Pencil hardware QA, advanced modeling tools.
Each feature must be validated against the relevant Shapr3D manual page and tested before marked complete.
