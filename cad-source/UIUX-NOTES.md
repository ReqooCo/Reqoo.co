# Precision modeling UI/UX review

Scope: selecting geometry, moving/scaling a part, snapping, and aligning two cylindrical parts. The six supplied Shapr3D iPad screenshots and the official guides are references for layout, typography and interaction patterns; its native application was not run in this review.

| Step | Earlier Reqoo behavior | Shapr3D reference | Updated Reqoo behavior / validation |
| --- | --- | --- | --- |
| 1. Select and transform | World XYZ only; coordinate frame and pivot were implicit. | Directional arrows, precise dimension labels, geometry-oriented gizmo and movable center. | World/Local controls beside the dimension, geometry-derived body/face axes, body-centre/origin/selected-face pivot. Switching frames preserves displacement; orbit does not change axes. Native and browser checks pass. |
| 2. Snap | Generic point/centre text; little visible information about the actual target. | Separate grid/geometry settings, guidepoints, guidelines and pointer hints. | Named endpoint/midpoint/centre/origin markers, purple guides, independent grid/geometry and guide/hint switches, exact numeric input and Alt bypass. Browser/native checks cover visibility, persistence and coordinates. |
| 3. Align | Bounding anchors and planar faces; cylindrical parts required manual positioning. | Explicit moving/target geometry, alignment preview and Flip adjustment. | Concentric cylindrical-face alignment, clearly named moving/fixed roles, numbered pick/preview steps, axis guides, axial anchors/offset, flip and rotation. Native tests preserve volume and the fixed part; browser checks cover touch picking, undo/redo and reload. |

## Visual evidence

The development-browser run captured `test-results/uiux-before/transform-scale-gizmo.png` and `transform-part-alignment.png` before implementation. New captures are `test-results/precision-local-gizmo.png`, `precision-snap-guides.png`, `precision-sketch-endpoint.png`, `precision-concentric-alignment.png`, and `precision-ipad-workspace.png`. CI uploads the new captures with the CAD QA artifact.

## Findings and applied repairs

- Geometry type is now named in the action strip, with fewer actions on a cylindrical face. Unrelated body actions are hidden while sketching.
- Transform controls avoid the arrow hit targets and remain inside the canvas on iPad and phone layouts.
- Snapping uses both marks and descriptive text. Moving and fixed roles use both labels and distinct colors.
- Exact typed distances remain exact; snapping applies only while dragging or locating sketch points.
- The comparison is limited to these flows. It does not establish full feature, performance, Pencil, or accessibility parity with Shapr3D.

## Primary references

- [Move and copy items using the gizmo](https://support.shapr3d.com/hc/en-us/articles/7383914603548-Move-and-copy-items-using-the-gizmo)
- [Snapping Options](https://support.shapr3d.com/hc/en-us/articles/7873946289564-Snapping-Options)
- [Align](https://support.shapr3d.com/hc/en-us/articles/7874398317596-Align)
- [Shapr3D modeling space](https://support.shapr3d.com/hc/en-us/articles/7873880676508-Shapr3D-modeling-space)

## Supplied iPad reference implementation

The workspace now uses contextual actions on the left, stable utilities on the right, a floating project capsule, and dimensions beside geometry. Sketch tools launch directly on the selected planar face, with measured diameter/size feedback while drawing. Preview faces retain their selection highlight after native topology rebuilds.

Typography uses the native Apple system/SF stack on iPad, with platform fallbacks elsewhere: 18 px project heading, 15 px tool labels, 16 px dimension values, and 18/16 px tool guidance. Light/dark preferences remain persistent. The supplied screenshots are reference material and are not redistributed in the repository.

Browser evidence: `reference-modeling-desktop.png`, `reference-offset-face-desktop.png`, `reference-circle-drawing.png`, `reference-ipad-modeling.png`, and `reference-phone-modeling.png` in the QA artifact.

## Plane-first sketch and rotation release

New Sketch now displays three semi-transparent 3D XY/XZ/YZ planes with raycast selection and accessible labels. Selecting a plane faces its normal and immediately activates direct rectangle drawing. Circle, ellipse, polygon, line/polyline, arc and spline tools retain the chosen plane. Width/height and geometry annotations edit the native sketch before Finish; cancellation restores the starting document and undo stack. Existing sketches remain editable in history.

Rotation now uses three actual raycastable on-canvas rings, World/Local axes, body-centre/origin/selected-face pivots, signed numeric degrees, configurable angle snapping and an immediate Three.js preview. Apply creates a native B-rep history operation; cancel removes the preview. Camera navigation is suspended during ring dragging. STEP export remains native.

Known scope limits: non-uniform scaling is unavailable in the currently shipped kernel binding (BRepBuilderAPI_GTransform is not exposed); Scale explicitly remains uniform. Trim and cross-entity circle/tangent/concentric sketch constraints are unavailable; the solver supports shared-vertex polyline horizontal/vertical, parallel/perpendicular, coincidence, equal length, midpoint, fixed points, lengths and angles, with conflict rejection. Circular patterns use the native feature form; linear patterns use direct arrows. X-ray is supported; computed hidden-edge classification is unavailable. Sweep uses a round profile. Face offset uses the existing supported planar/analytic operations and can reject incompatible topology. History suppression is limited to leaf features. Physical iPad/Apple Pencil latency and native Shapr3D parity have not been verified.

Release QA adds actual touch/pointer sketch creation on all three planes, exact dimensions, extrusion, upstream edit/rebuild, cancel transaction, ring rotation/pivot/angle, native STEP roundtrip and responsive typography checks. Full build/CI and production identity must be verified before release.

## Camera and commit continuity repair

Commit now keeps the displayed Move/Scale/Rotate/Pattern or direct-edit preview until the exact worker result arrives, then swaps the model synchronously. Other edits are blocked during that transaction; a failed kernel build restores the last valid model/history. The latency regression holds delivery of actual native worker results and checks multiple rendered frames; no geometry is mocked.

Orbit navigation synchronizes OrbitControls' cached up-frame with named views, sketch planes and cube rotation. Camera inertia is disabled for immediate finger/mouse response and a predictable stop on release. Planar pull/extrude anchors use the native face centre rather than the picked point; extrusion handles follow the signed endpoint. Cylinder diameter handles retain a geometry-owned radial direction at mid-height. Grid visibility is available in the right toolbar, Settings and the G shortcut, with persistent preference storage.


## Closed sketches on solid faces

- Dark-mode dimension overlays remain transparent; only the editable labels paint a panel background.
- Rectangle and ellipse drawing offers Center/Corner start modes. Circles offer Center/Diameter. The outline, native profile and exact size editor use the same drag recipe; tool preferences persist.
- Finishing closed sketches on a planar host imprints their boundaries into the native B-rep. Solid mode selects the inner disk or outer remainder independently. Source sketches remain editable through Items, Sketch selection and history.
- Imprints preserve volume and solid count, validate the native result, rebuild after parent edits and survive STEP export. Non-overlapping sketches remain independent. Planar face references include boundary-loop signatures to distinguish concentric disk/remainder regions; ambiguous topology changes fail safely.
- Saved projects with a closed sketch attached to a currently visible planar host are migrated on opening. Consumed or missing hosts are not revived.
- QA: `planar-regions.mjs` covers exact native regions, independent extrusion, upstream radius changes and STEP roundtrip; `sketch-regions-ui.mjs` covers touch drawing modes, dark overlay focus, real face-region pointer picks, extrusion, Undo/Redo, reopening and migration.
