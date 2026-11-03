# REQOO CAD functional parity matrix
This is an evidence matrix, not a claim of full Shapr3D parity or a finished industrial CAD product.
The baseline is the official [Shapr3D manual](https://support.shapr3d.com/hc/en-us/articles/9760033847964-Shapr3D-Manual), [input/navigation guide](https://support.shapr3d.com/hc/en-us/articles/7873906073884-Keyboard-shortcuts-gestures-and-hotkeys), and [Chamfer/Fillet guide](https://support.shapr3d.com/hc/en-us/articles/7874402399900-Chamfer-Fillet).
Interface assets are original REQOO SVG/code.

Statuses: **Implemented and tested**, **Implemented but not fully verified**, **Partially implemented**, **Not implemented**.
"Tested" means automated Chromium/kernel checks at this release, not physical iPad/Apple Pencil certification.

| Requested workflow | Status | Evidence / boundary |
|---|---|---|
| Project → Sketch → Solid → history → export | Implemented and tested | acceptance.mjs completes circle/cylinder/pull/hole/fillet/chamfer/save/reload/STEP/STL |
| Separate Sketch / Solid workspaces | Implemented and tested | cad.mjs tool visibility and mode transitions |
| Line / polyline | Implemented and tested | drawn/numeric shared-vertex profiles; constraint and extrusion regressions |
| Rectangle | Implemented and tested | editable dimensions, downstream volume assertions |
| Circle | Implemented and tested | pen emulation drawing, in-canvas diameter edit, native cylinder |
| Arc | Partially implemented | sagitta arc; not full centre/three-point variants |
| Ellipse | Implemented but not fully verified | numeric/drawn primitive; no complete variant/constraint acceptance suite |
| Polygon | Implemented but not fully verified | numeric/drawn regular polygon; not all variants |
| Spline | Partially implemented | interpolated points; no persistent tangent/curvature handle editor |
| Offset sketch | Implemented and tested | native 2D offset with dependent extrusion analytic volume |
| Fillet sketch | Implemented and tested | native rounded-rectangle area and extrusion assertions |
| Mirror sketch | Implemented and tested | derived local-axis mirror, preserved analytic area |
| Trim sketch | Not implemented | no arbitrary intersection trimming |
| Extend sketch | Not implemented | no general curve extension |
| Pattern sketch | Not implemented | body patterns exist; no sketch pattern constraint network |
| Construction geometry | Implemented and tested | wire-only display; extrusion rejected transactionally |
| Project edges into sketch | Not implemented | no exact arbitrary edge projection tool |
| Edit existing sketch / choose plane / planar face sketch | Implemented and tested | cad.mjs face-based sketch and downstream edits |
| Coincident constraint | Implemented and tested | shared vertices / explicit coincidence solver test |
| Horizontal / vertical constraints | Implemented and tested | solver and constrained-profile UI acceptance |
| Parallel / perpendicular / equal length | Implemented and tested | solver checks; polyline segment relation controls |
| Midpoint constraint | Partially implemented | solver tested; no dedicated midpoint selection UI |
| Angular / length dimensions | Implemented and tested | polyline solver and in-canvas driving dimension paths |
| Circle diameter / rectangle size dimensions | Implemented and tested | in-canvas edit and downstream solid validation |
| Tangent constraints | Not implemented | no circle/line tangency constraint graph |
| Concentric constraints | Not implemented | no multi-profile concentric solver |
| Fully constrained / underdefined indicators | Partially implemented | rank-based for polyline constraints; not a general mixed-curve sketch solver |
| Extrude profile | Implemented and tested | live temporary BREP preview and real commit/history |
| Extrude face, Add / Subtract / Intersect backend | Partially implemented | native backend; direct face extrusion defaults Add; full extent/boolean chooser not complete |
| Symmetric / to-object extrusion | Not implemented | no full extent system |
| Revolve | Partially implemented | analytic volume test; limited axis/origin UI |
| Sweep | Partially implemented | tested round-profile sweep; arbitrary section/orientation controls incomplete |
| Loft | Partially implemented | tested two-profile loft; guides/multi-section workflow incomplete |
| Hole | Implemented and tested | face/circle, target body, through/blind, diameter/depth/centre history edits |
| Shell | Implemented and tested | native 2 mm wall volume |
| Face Push/Pull | Partially implemented | live native BREP preview, signed commit, undo; planar faces only |
| Move Face | Partially implemented | normal-direction planar push/pull; no arbitrary face transform |
| Replace Face | Not implemented | no supported native tool surfaced |
| Draft / Taper | Partially implemented | selected native face/neutral-plane numeric taper with analytic wedge volume; no complete draft workflow |
| Edge Fillet | Partially implemented | selected-edge radius drag/numeric BREP preview tested; no advanced corner/G2/chordal suite |
| Edge Chamfer | Partially implemented | selected-edge equal-distance direct preview tested; no two-distance workflow |
| Boolean union / subtract / intersect | Implemented and tested | exact volume regressions |
| Split Body | Implemented and tested | two independently selectable native solids |
| Move / Rotate / uniform Scale / Mirror | Implemented and tested | analytic volumes and transforms |
| Local/global 3-axis transform gizmo | Not implemented | numeric transforms remain available |
| Non-uniform scale | Not implemented | uniform scale only |
| Linear / circular body pattern | Implemented and tested | native compound counts and volumes |
| Align | Implemented but not fully verified | body-centre axis align; no full mating/face align workflow |
| Construction plane / axis | Partially implemented | numeric creation; arbitrary placement/edit interaction incomplete |
| Measure | Implemented and tested | lengths, areas, volumes, exact minimum distance |
| Section View | Implemented but not fully verified | XY clipping plane; not arbitrary plane sectioning |
| Face/profile/edge contextual actions | Implemented and tested | acceptance uses real canvas selection and owned arrow |
| Live solid preview / apply / cancel | Implemented and tested | temporary kernel model; committed document unchanged until Apply |
| Overlap selection cycling | Implemented and tested | explicit Select other chooser |
| Grid / endpoint / centre snapping | Partially implemented | snap candidates implemented; exhaustive imported/complex geometry snapping not verified |
| Pencil tap/draw and palm reduction | Implemented but not fully verified | Chromium pen protocol + concurrent touch tests pass; physical Apple Pencil unverified |
| Pinch zoom / two-finger pan / one-finger orbit | Implemented and tested | real browser touch protocol navigation assertions |
| iPad / desktop / phone layout | Implemented and tested | viewport and touch emulation screenshots; physical-device QA still required |
| Object rename / visibility / isolation | Implemented and tested | browser object/history checks and shared native model |
| Feature edit / dependency rebuild / Undo / Redo | Implemented and tested | native downstream geometry and volume checks |
| Suppress / remove leaf features | Implemented and tested | reversible safe leaf operations; dependent suppression intentionally restricted |
| Persistent topology references | Partially implemented | normalized geometric descriptors with ambiguity rejection; legacy indices remain supported/validated |
| Worker processing / transactional failures | Implemented and tested | serialized kernel, temporary model disposal, invalid-operation rollback |
| Very large models / long assemblies | Implemented but not fully verified | bounded feature/body limits; no industrial-scale performance certification |
| Millimetres / inches and precision | Partially implemented | solid numeric and direct fields tested; polyline point editor explicitly stays in mm |
| Light / dark themes | Implemented and tested | persisted preferences and render background |
| New / Open / Save / Autosave / backup | Implemented and tested | native v1 format remains backward compatible; previous autosave retained |
| STEP import / export | Implemented and tested | native BREP roundtrip and acceptance STEP output |
| STL export | Implemented and tested | binary triangle-count/byte-length validation |
| 3MF export | Implemented and tested | valid OPC ZIP, millimetre mesh resources from actual kernel tessellation |
| SVG / DXF sketch export | Partially implemented | circle/rectangle/polygon/polyline only; exact mm circle checks; advanced curves/derived sketches not supported |
| Separate Generators module | Partially implemented | existing /3d-studio/ preserved and linked; automatic editable-BREP transfer not implemented |
| Production source/asset consistency | Implemented and tested | deterministic source hash in HTML, JS and version.json; live preview/production checks recorded in release report |

## Significant remaining work
General mixed-entity sketch constraints (tangent/concentric/symmetry), arbitrary trim/extend/project, sketch patterns, full extrusion extents, advanced fillets/chamfers, curved-face direct editing, replace-face, a full transform gizmo, arbitrary face resizing, robust named topology across major topology changes, generator-to-editable-BREP transfer, and physical Apple Pencil/Safari QA remain incomplete.
These gaps are not represented by fake buttons or visually simulated geometry.
