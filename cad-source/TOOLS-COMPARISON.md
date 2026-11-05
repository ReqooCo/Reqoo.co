# R3ds tool coverage and workflow comparison

Development audit, 5 November 2026. This is a scope comparison, not a claim of Shapr3D parity. A display mesh is not the authoritative CAD model: R3ds operations below use Replicad/OpenCascade unless explicitly described as previews.

## Sketch

| Shapr3D tool | Purpose | R3ds implementation / limitation |
|---|---|---|
| Line / Arc, Arc | Straight segments and curved segments | Polyline and arc; not a full automatic line–arc inference system |
| Rectangle | Closed rectangular profiles | Direct draw, center/corner start, editable width/height |
| Circle | Circular profile | Direct draw and diameter editing |
| Ellipse | Elliptical profile | Direct draw; editable radii |
| Polygon | Regular polygon | Parameterized sides and radius |
| Spline | Free curves | Supported drawing; fewer curve editing controls |
| Offset Edge | Parallel sketch contours | Native closed-profile offset; associative planar-face Offset Sketch added |
| Trim | Remove geometry between intersections | R3ds Trim currently subtracts closed regions. Segment trim between arbitrary intersections remains unavailable |
| Move/Rotate Sketch | Position sketch entities | Feature transforms; no complete in-sketch entity transform workflow |
| Pattern Sketch | Repeated constrained sketch entities | Solid pattern exists; constrained sketch pattern is not equivalent |
| Text | Text outlines | Not available |
| Delete | Remove selected geometry | Feature deletion; dependent features may need repair |

R3ds Profile combines closed coplanar sketches using Join, Trim region or Intersect. This supports regions with holes and subsequent native extrusion. It does not provide a general sketch solver or arbitrary segment trimming.

## Constraints and dimensions

| Shapr3D controls | Purpose | R3ds scope |
|---|---|---|
| Horizontal/Vertical, Parallel, Perpendicular | Direction relationships | Polyline constraints; not every entity combination |
| Coincident, Midpoint, Equal, Lock | Geometric relationships | Limited polyline solver; not a general constrained sketch graph |
| Tangent, Concentric, Symmetry | Curve and symmetry relationships | Full constraint workflow unavailable; snapping is not a persistent constraint |
| Disconnect, Make Construction | Constraint removal / reference geometry | Construction geometry supported; relationship editing limited |
| Length, radius/diameter, angle | Driving dimensions | Editable sketch dimensions and coplanar smart dimensions |
| Measure | Read-only distances, angles and sizes | Native B-rep distances and object properties; cross-plane sketch routing needs improvement |
| Variables / expressions | Shared parameter relationships | Not available as a general expression system |

## Solid modeling

| Shapr3D tool | Purpose | R3ds scope |
|---|---|---|
| Extrude | Pull one or more profiles/faces | Native extrusion; this increment adds multiple closed profiles in one feature with New Body / Add / Subtract / Intersect |
| Offset Face | Resize existing faces | Native planar prism add/cut; not general curved-face extension and adjacent-face trimming |
| Chamfer / Fillet | Bevel / round edges | Native edge operations and history; multi-edge direct input repaired in this increment, interaction verification pending |
| Shell | Hollow bodies | Native kernel operation; valid face/thickness combinations required |
| Revolve | Rotate profile around axis | Implemented; arbitrary picked-axis workflow limited |
| Loft | Transition between sections | Two-profile implementation; no full guide-curve workflow |
| Sweep | Profile along path | Current round-section path implementation; not arbitrary-section parity |
| Union / Subtract / Intersect | Boolean combinations | Native operations |
| Split Body | Divide a body | Supported within current plane/tool limits |
| Replace Face | Extend/trim body to another surface | Not available |
| Offset Edge (3D) | Offset spatial edges | Not available as a general tool |
| Project | Project geometry to sketch/surface | Planar region imprint exists; not general projection parity |
| Wrap / Emboss | Wrap or imprint on curved surfaces | Not available |
| Fill (Beta) | Surface filling | Not available |
| Visualization | Material and scene appearance | Real-time PBR, 20 presets, procedural/uploaded textures, studio lighting and PNG; not an offline path-traced renderer |

R3ds also exposes Hole, Draft and Thread. Their presence does not imply they belong to the same Shapr3D menu or have equivalent scope. Thread requires compatible cylindrical geometry and valid native export.

## Transform and navigation

| Shapr3D tool | Purpose | R3ds scope |
|---|---|---|
| Move/Rotate | Translation and rotation | World/local arrows, rings, exact values, undo/redo |
| Translate | Point-to-point positioning | Axis move exists; dedicated point-pair workflow limited |
| Scale | Resize geometry | Uniform scaling; general nonuniform B-rep scaling unavailable |
| Pattern | Linear/circular copies | Supported; single linear vector and limited circular options |
| Rotate Around Axis | Custom-axis rotation | Gizmo pivot/frame controls; picked arbitrary-axis UX limited |
| Align | Source to target alignment | Part/planar/cylindrical alignment; setup remains more verbose |
| Mirror | Reflect geometry | Native feature operation |
| Construction Plane / Axis | Reference geometry | Implemented within supported options |
| Isolate / Section View / Measure | Inspect geometry | Available; section is display clipping, not a new solid |
| Items / History | Visibility and feature editing | Eye controls, selection, feature editing and undo/redo; no complete assembly system |

## Interaction priorities

1. Additive canvas selection without a multi-select switch. Empty canvas clears; repeated tap toggles an entity.
2. All selected profiles contribute to one extrusion transaction; history, undo and persistence preserve the result.
3. Context actions must follow the whole selection, not only the most recently selected entity.
4. Show only relevant compact controls, with exact values on canvas.
5. Keep lightweight preview visible until the validated native result replaces it.
6. Explicitly distinguish region trim, planar offset and uniform scale from broader unsupported operations.

## Primary references

- [Shapr3D manual](https://support.shapr3d.com/hc/en-us/articles/9760033847964-Shapr3D-Manual)
- [Sketch menu](https://support.shapr3d.com/hc/en-us/sections/7768311423516)
- [Tools menu](https://support.shapr3d.com/hc/en-us/sections/7768348416028)
- [Transform menu](https://support.shapr3d.com/hc/en-us/sections/7768328803228-Transform-menu)
- [Constraints](https://support.shapr3d.com/hc/en-us/sections/9307825076892)
- [Adaptive interface](https://support.shapr3d.com/hc/en-us/articles/7873882619548-Adaptive-user-interface)
- [Extrude](https://support.shapr3d.com/hc/en-us/articles/7874453786908-Extrude)
- [Offset Face](https://support.shapr3d.com/hc/en-us/articles/7874400678428-Offset-Face)
