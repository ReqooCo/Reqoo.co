# REDS Sketch: Shapr3D apple-to-apple comparison (2026-11-06)

**Scope:** REQOO REDS / R3ds web CAD, source in `cad-source`; Shapr3D product documentation updated 2026. The table is a *feature-by-feature audit*, not a claim of identical capability or trademark/UI identity.

**UX objective:** in Sketch mode, select actual plane or planar face, tap geometry, draw and edit in the viewport. A single contextual tool, direct drag, accurate numeric value, Undo/Redo, persistent native file, and no unnecessary floating panels.

## Capability parity and evidence

Legend: **Implemented** means code and test are present but still require latest CI; **Partial** means meaningful subset; **Gap** means not verified/available at Shapr3D depth.

| Feature | Shapr3D baseline | REDS evidence/target | Status |
|---|---|---|---|
| 1. Start sketch | Tap plane or planar face, enter sketch | `sketch-planes.js`; existing face selection | Implemented |
| 2. Align camera to plane | Normal view, direct sketch | `beginDrawing` aligns and locks left drag | Implemented |
| 3. Line/polyline | Direct tap segments | `sketch-stroke.js`, `main.js` | Implemented |
| 4. Rectangle | Corner/center, editable dimensions | `sketch-drag.js`, `sketchExact` | Implemented |
| 5. Circle | Center/radius/diameter | `sketch-drag.js`, sketch dimension overlays | Implemented |
| 6. Ellipse/polygon | Direct sketch | Native recipes | Implemented |
| 7. Arc/spline | Interactive drawing/edit | Initial primitives, limited curve editing | Partial |
| 8. Trim edge | Tap line/arc segment between intersections | New `sketch-edit-geometry.js` + `Trim sketch segment` button; exact straight segment cutting plus circular/arc Trim against line/rectangle/circle/arc boundaries; native circular arc remainders; ellipse/spline curve Trim still incomplete | Partial |
| 9. Trim closed region | Trim area/cut | Existing `sketchProfile` Cut, separate from Trim Edge | Implemented |
| 10. Offset Single | Select edge, drag/enter distance | New mode: straight line/rectangle segment, source edge index | Partial |
| 11. Offset Chain | Select chain/profile, drag/enter distance | Native closed profile offset; new open polyline offset with precise miter geometry | Partial |
| 12. Sketch Offset on face | Offset from 3D face geometry | Existing `faceSketch` with distance parameter | Partial |
| 13. Project Face to sketch | Project planar face boundaries, linked | New contextual one-tap `Project face to sketch`, existing native `faceSketch` source dependency | Partial |
| 14. Project sketch-to-sketch | Sketch to target face/plane; linked/unlinked | No equivalent full workflow verified | Gap |
| 15. Project to curved face | Edge projection to nonplanar face | No verified equivalent | Gap |
| 16. Dimension length | Editable direct label | Smart Dimensions + pinned dimensions | Partial |
| 17. Radius/diameter | Editable | Existing circle/face dimensions | Partial |
| 18. Angle | Constraints/dimension | Existing angle constraints; coverage incomplete | Partial |
| 19. Auto constraints | Coincident, horizontal, tangent etc. | Existing `constraints.js` subset | Partial |
| 20. Fully-defined state | Distinct state and color | Not complete for all sketch geometry | Gap |
| 21. Construction lines | Toggle geometry | Existing construction geometry for sketch | Partial |
| 22. Profile detection | Areas, nested regions | `planar-regions.js`, imprint and nested profile picking | Partial |
| 23. Edit old sketch | Parent feature, downstream rebuild | Existing feature history; topology edge cases known | Partial |
| 24. Undo/Redo | All editing operations | Native history transaction via `rebuild` | Implemented |
| 25. Save/Open | Native project preserves sketch/history | `project-io.js`; unresolved user fixture #274 | Partial |
| 26. Mouse/touch/pen | Multi-input workflows | Playwright + existing pointer/touch handling; physical iPad Pencil pending | Partial |
| 27. Error recovery | Invalid sketch leaves original document intact | `rebuild` atomic commit after worker success | Implemented |
| 28. Performance | Immediate live sketch preview | Existing preview pipeline; full target-device p95 benchmarks pending | Partial |

### Exact behavior required for acceptance

**Trim Edge:** Draw a line 20 mm long crossing a centered rectangle 8 mm wide at X=10; tap the crossing line inside the rectangle. The selected line is split at X=6 and X=14, retaining two original-coordinate open segments. The rectangle remains intact. Undo restores the full line; Redo reapplies the cut; Save/Open preserves both fragments. Clicking any unresolved curved segment must not silently delete the wrong object.

**Offset Edge:** Select the horizontal line from (0,0) to (20,0), enter +2 mm offset, obtain (0,2) to (20,2). For polyline with a right-angle corner at (20,0), a +2 mm Chain yields the mathematically correct miter intersection at (18,2). A Single offset of the vertical second edge must yield X=18. Existing closed-profile Offset remains functional; exact native B-Rep geometry is required.

**Project Face → Sketch:** Create a 20×10×8 mm box; select the top planar face; tap Project face to sketch; obtain a 200 mm² closed native sketch with dependency on the box. Edit box width from 20 to 24; projected sketch area becomes 240 mm². Clicking the 3D face must not substitute a mesh-only silhouette.

### Official Shapr3D references

- Sketching overview: https://support.shapr3d.com/hc/en-us/articles/18816009328284-Sketching-in-Shapr3D
- Trim: https://support.shapr3d.com/hc/en-us/articles/7874324658204-Trim
- Offset Edge Sketch: https://support.shapr3d.com/hc/en-us/articles/7874298998172-Offset-Edge-Sketch
- Project: https://support.shapr3d.com/hc/en-us/articles/7874464667676-Project
- Editing sketch dimensions: https://support.shapr3d.com/hc/en-us/articles/7874245890844-Editing-sketch-dimensions

### Release gate

Keep this change as a draft until (1) core/modeling/product CI all pass, (2) branch preview screenshot of empty/sketch/Trim/Offset/Project on 390px and 1180px, (3) old CAD files remain openable, and (4) application project flow sketch→solid rebuild→Save/Open is regression tested. **Partial** features must not be described as Shapr3D parity. Future work: curved Trim, linked projections to any plane/nonplanar surfaces, full constraint solver, direct geometry dimensioning and iPad Apple Pencil real-device tests.
