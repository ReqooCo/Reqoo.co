# REDS sketch system: deep check and engineering direction

Date: 2026-11-07. Starting Draft: 9dd0699. This is a source, native-geometry and browser audit; it does not claim Shapr3D parity or physical iPad validation.

## Findings from the reported drawing

1. Trim had separate analytic formula paths and a whitelist. Spline targets, curve boundaries and derived geometry did not share the same representation. The unsupported-boundary message was a real limitation, not user error.
2. Arc preview rendered only its chord. The committed object was curved. Arc height was not exposed as an attached dimension.
3. Spline preview rendered a polyline while commit fitted a native B-spline. A user could not judge the actual curve before committing it.
4. Serialized sketch drawings returned early from `profile()`, bypassing subsequent operations. Offset after a derived curve could create a history feature without changing the geometry.
5. Open-curve Offset eligibility did not include spline/native Trim results. Native wire offset can fail for splines and needs a controlled curve-offset fallback.
6. Long-press could select interface text on iPad, exposing browser Copy/Search actions over the canvas.

## Repairs implemented in this revision

- Added a native curve Trim feature with source and boundary references. Original input history remains intact. Finite intersections, curve parameters, splitting and retained native curves use OpenCascade. This supports line/arc/circle/ellipse/spline targets and boundaries, including self-intersecting splines, native projected outlines and derived Offset targets.
- Native curve vertices bound a Trim interval; artificial full-circle/ellipse seams do not. Ambiguous selected intersections/coincident intervals reject. Coincidence elsewhere no longer blocks an otherwise unambiguous interval.
- Complex native planar outlines are transformed into the active plane and read as analytic/B-spline curves, including rational weights. No tessellated sketch replacement is used for Trim.
- Arc has a curved preview matching commit and an attached editable height dimension.
- Spline preview uses the native fitted curve in the worker with one running request and one latest pending request. Preview messages omit the project document; stale sessions cannot overwrite a later sketch.
- Serialized drawings now process subsequent operations. Open native Trim/spline results can enter Offset. A single-spline offset fallback uses an OpenCascade offset curve and B-spline approximation at 0.00001 mm tolerance; it is not represented as straight segments.
- Canvas callout/text selection is suppressed while numeric input remains editable.

## Tool and relationship review

| Tool | Working path and evidence | Remaining work |
|---|---|---|
| Line / Polyline | Tap/drag, closure, draft Undo, dimensions/constraints; native Trim and Chain Offset regressions | Richer automatic connectivity/constraints across independent entities |
| Rectangle | Corner/Center, exact W/H, native Extrude; Trim against spline tested without erasing other edges | Three-point/rotated rectangle creation; dense dimension placement |
| Circle | Center/Diameter, editable diameter, ring selection and downstream rebuild | More crowded-circle selection cases and persistent constraint relationships |
| Arc | Height/3-point/Center construction, signed height, direct planar endpoint/bulge handles, native preview/Trim/Offset and history | Tangent continuation and cross-entity constraints |
| Spline | Fit/Control modes, direct defining-point handles, insertion/removal, exact periodic closed Control spline, native preview/Trim/Offset and Save/Open | Fit tangent/curvature handles, smooth Fit closure, shape-preserving knot insertion |
| Ellipse | W/H and native Trim target/boundary; native closed Offset path | Direct rotation/axis handles and more offset-collapse cases |
| Polygon | Radius and side-count recipe; straight-edge representation | Direct side-count interaction and a wider dedicated polygon workflow matrix |
| Trim | One shared native curve kernel for all sketch Trim; source-preserving history, exact retained curves | Persistent normalized topology references after upstream size edits |
| Offset | Connected multi-profile and batch offsets, repeated native chains, spline fallback | Branched-chain choice, multiple hole-loop offsets, mixed spline joins/cusps |
| Project Face | Linked planar native outline, upstream rebuild, native Trim | Full projected-entity editing/constraint policy |
| Sketch Fillet / Mirror | Serialized-drawing operations now execute; existing closed-profile native regressions remain | More mixed-curve corner cases, native-outline mirror policy and selection-driven handles |
| Extrude / downstream solids | Existing native volumes/history tests; new Trim outputs remain native sketches | Wider closed multi-curve region and upstream-reference recovery cases |
| Export SVG / DXF | Native Trim SVG and line/circular-arc DXF preserve export; source circle/rectangle legacy exports retained | Exact spline/ellipse DXF entities and export coverage across all derived contours |
| Undo / Save / Open | Existing regression suites plus new Trim history/curve tests | Owner's real failing project fixtures and physical device persistence tests |
| Constraints / Snapping | Existing solver/native regressions; guidepoint cache | Complete tangency/curvature solver and automatic cross-entity constraint capture |

## Verification meaning

The new native matrix exercises 25 sampled target/boundary pairs among line, arc, circle, ellipse and spline. It also checks principal sketch planes, self-intersections, derived and projected targets, source immutability, native vertices, arc preview accuracy, coincidence handling, and Spline → Trim → Offset with a sampled 1 mm normal-distance check. This matrix is not every possible topology or pointer position.

Browser coverage checks Arc preview and attached height editing, native Spline preview, touch Spline Trim, rectangle Trim against a spline boundary, Undo/Redo, reopen, and Offset eligibility after Trim. Existing Core/Modeling/Product and canonical Draft verification must still pass at the final exact commit before the revision is called ready.

## Next engineering priorities

1. One explicit sketch/entity state model and normalized geometry references for all edits; do not keep adding shape-name exceptions.
2. Extend completed Arc endpoint/bulge and Spline defining-point controls with tangent/curvature handles, connected-entity constraints and shape-preserving insertion.
3. Persist endpoint/tangent/constraint relationships separately from visual snap suggestions.
4. Profile actual iPad gestures/frame timing on the owner's crowded sketch, including selection ambiguity and keyboard/callout behavior.

## Primary references consulted

- Shapr3D Trim: https://support.shapr3d.com/hc/en-us/articles/7874324658204-Trim
- Shapr3D Spline: https://support.shapr3d.com/hc/en-us/articles/7257132997916-Spline
- Shapr3D adaptive UI: https://support.shapr3d.com/hc/en-us/articles/7873882619548-Adaptive-user-interface
- OpenCascade intersection algorithms: https://www.occt3d.com/dev/doc/overview/html/occt_user_guides__modeling_algos.html
- Replicad's installed source and declarations (1.2.0) for curve adaptors, serialization and native sketch generation.

History remains capped by the existing project limits; larger sketch histories need separate performance and recovery work.

Production remains unchanged; #278 release lock is retained.

2026-11-07 continuation: Arc/Spline modes and direct-point controls are implemented; latest exact-head validation is recorded in PR #277 and REDS-HANDOFF.md. Defining-point insertion may reshape a spline. Control closure is periodic; legacy Fit closure remains unchanged.
