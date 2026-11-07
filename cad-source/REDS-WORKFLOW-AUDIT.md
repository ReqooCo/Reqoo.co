# REDS tool workflow audit — 2026-11-07

Scope: selection → tool admission → preview → Apply/Cancel → next action → Undo/Redo → Save/Open. This audit covers the tool families below and their shared transitions; it does not claim every possible geometry or Shapr3D parity.

## Reported repeat Extrude failure

The screenshot status is the mixed-reference guard, not a native extrusion error. Canvas picking always appended to selection. A previously selected body/face survived when a new sketch was tapped; the second Extrude received both references and rejected them. Picking a different face could also retain the previous face. Tests that seeded a fresh selection before each independent tool missed this transition.

Automatic selection now accumulates compatible sketches/bodies and same-body edges, preserving existing multiple-profile extrusion and finishing. Crossing reference domains replaces the old selection. Automatic face picking replaces a different face; explicit Faces filtering or keyboard extension retains deliberate multi-face selection for measurement/alignment. Explicit programmatic multi-selection remains unchanged and incompatible tool inputs are rejected at entry.

## Shared entry contracts

`src/tool-workflow.js` is the common UI admission contract used by Solid/generic tool launch, contextual actions and direct extrusion references. Specialized Sketch sessions additionally retain their own source/plane/corner validation and selection-during-tool lifecycle. The native kernel remains the final validity check; an accepted selection does not guarantee that a particular fillet radius, offset or boolean is geometrically possible. The direct arrow uses actual native profile closure, so derived open Trim curves cannot masquerade as closed source profiles.

| Tools | Required input / ordering | Main workflow evidence |
|---|---|---|
| Line, rectangle, circle, ellipse, polygon, Arc, Spline, Text | Chosen world/face plane; defining dimensions/points; source recipe | sketch-stroke, direct-sketch, curve-handles, sketch-tools UI/native suites |
| Trim | Source sketch curve plus finite boundaries/pick; same plane | curve-trim, curve-system, reds-sketch-parity; original uploaded-history regression |
| Offset | Selected native sketch curves; Single/connected Chain; distance | offset-chain, active-sketch-edit, reds-sketch-parity and curve-system |
| Sketch Mirror, Move/Rotate, Pattern | Sketch sources; plane-owned parameters | sketch-tools UI/native; Apply/Cancel/History and mode-switch preservation |
| Sketch Fillet/Chamfer | Native corners or all eligible corners | sketch-tools native volumes; selected corner handles and consumed-source History edit |
| Project / face sketch | Selected native source / one planar solid face | sketch-tools linked projection, multi-profile UI, upstream rebuild/reopen |
| Profile / imprint | Closed profiles / host face and sketch regions | sketch-regions, planar-regions and native parity |
| Extrude | Closed non-construction sketches with matching parallel normals, or one planar face | repeated workflow UI plus extrude-modes, multi-profile, direct-sketch, acceptance |
| Revolve | One closed source profile | cad native volume and canvas-gizmo integration |
| Loft | At least two closed profiles | cad native loft and canvas-gizmo integration |
| Sweep | Closed profile first, sketch path second | cad native sweep and invalid-order entry test |
| Move, Rotate, Scale | Solid bodies; pivot/frame and distance/angle/factor | motion-continuity, transform, rotation and canvas-gizmo UI |
| Solid Mirror, Copy, Linear/Circular Pattern | Mirror/Copy/Circular Pattern use one source; Linear Pattern supports selected bodies; plane/spacing/count | canvas-gizmo, pattern-thread and cad suites |
| Align / Concentric | Moving body first; target picked in alignment session | transform and precision UI, fixed-target/history assertions |
| Union, Subtract, Intersect | At least two solid bodies; ordered target/cutter where relevant | cad and extrude-modes native volume assertions |
| Fillet, Chamfer | Edges from one body, or one whole body with All edges | direct-sketch, acceptance, native finishing and preview-queue tests |
| Shell | One solid face, thickness | cad, canvas-gizmo and acceptance |
| Offset Face / Pull | One solid face; face-owned normal | product, motion-continuity, acceptance and direct-sketch |
| Draft / Taper | One solid face; angle and neutral plane | direct-preview-queue UI, invalid-angle block and Undo/Redo |
| Hole | One planar face or circular sketch, target/extent | acceptance, cad and canvas-gizmo; target isolation and consumed history |
| Thread | One complete cylindrical side face | pattern-thread / precision/native thread suites |
| Split Body | One body and construction plane | cad and canvas-gizmo |
| Box, Cylinder, Sphere, Torus, Plane, Axis, Import | New recipe; no selected source required | canvas-gizmo, cad and native project IO |
| Delete | Selected objects | native history/Undo and workspace suites |
| Save / Open / Export | Applied model, no pending previews | project-io, sketch-file-ux, cad and acceptance |

## Shared lifecycle fixes and verification

- Mixed selections cannot silently leak into another tool family. Existing deliberate multi-profile selection still works.
- Generic single-source Mirror/Copy/Circular Pattern reject multiple bodies instead of silently ignoring later inputs. Align admits one moving body and at most one target. Wrong inputs are rejected before a panel/gizmo is opened. Contextual actions advertise valid selections; open/construction profiles do not advertise solid extrusion.
- Native preview, Apply/Cancel and late-result cancellation remain the existing bounded queue/transaction paths. Original source recipes and failed-operation rollback are retained.
- New touch workflow: ellipse Extrude → new rectangle with old body selected → tap new profile → second Extrude → select solid face → face Extrude/Union → edge Fillet → next Move/Cancel → Undo/Redo → reopen. Native volumes and body count are asserted, not only button visibility.
- All Solid tool and transform entry points are exercised through real menu controls with an invalid open-path selection; no orphan gizmo or document/history mutation may result. Pure contract tests also cover every native feature type, stale references, construction/open profiles, edge ownership and profile/path order.
- Selection layout now has one final owner in `reds-focused-workspace.css`. Removed competing late overrides from `style.css`; context actions use a full-height scrolling icon dock, and the selection filter stays clear of context and Undo/Redo at 1180/820/390. Summary labels do not wrap into single letters.

## Boundaries

Fresh exact-head Core/Modeling/Product and canonical deployed Draft browser/source verification are required after the commit. Final results belong in PR #277. Physical iPad/Pencil performance is not established by headless touch tests. Complex boolean/finishing topology, normalized references after arbitrary upstream edits, advanced constraints and remaining Arc/Spline/export boundaries still need their dedicated follow-ups. Live remains unchanged and the #278 release lock is retained.
