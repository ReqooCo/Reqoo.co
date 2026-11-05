# Smart Dimension

Select two coplanar editable sketches with Multi-select: horizontal, vertical and direct-distance values appear immediately on the canvas. Tap a value to enter an exact distance in the compact editor; the first sketch stays fixed and the second moves. **More options** opens the full anchor/reference controls. Merely selecting sketches never changes the document or history. Values disappear when selection changes or another modeling tool starts.

Select one editable sketch and choose **Measure** (or **Smart Dimension**) to reference its plane origin. Select two sketches with Multi-select to measure between them.

Choose the fixed reference, its anchor, the moving sketch and its anchor. Horizontal and vertical values are signed in the moving sketch's local plane; direct distance is non-negative. The sketches must be coplanar, including sketches started on planar faces.

- **Reference** pins a measured value without changing geometry. Parentheses and a cyan label identify it.
- **Driving** pins an editable distance that positions the moving sketch. Gold identifies it. The reference recipe stays unchanged; dependent sketches and downstream native solids rebuild.
- Tap a pinned value to edit or remove it. Removing a driving dimension preserves the current position. Undo restores the constraint.
- Drag a label to move its annotation without moving geometry. Settings → Show pinned dimensions hides or restores labels.
- Pins, label offsets and driving relations survive project save/reopen. Units and precision follow Settings. SVG/DXF exports use resolved sketch placement; native solids/STEP use the same resolved geometry.

Supported anchors: circle/ellipse center and cardinal points; rectangle center, side midpoints and corners; polyline endpoints; polygon center and vertices. Derived/offset sketches are not editable Smart Dimension references in this increment. Existing solid measurement remains available separately.

A sketch supports one horizontal plus one vertical positional dimension, or one direct distance. These translate the sketch; they do not resize it, rotate it or solve arbitrary point-to-point relations within one sketch. Existing size/segment dimensions remain separate. Cross-plane driving dimensions, face/body driving dimensions, tangent distances, sketch projection, expressions and general coupled sketch solving are not implemented.

Missing/suppressed references, invalid anchors, conflicting positional rules, circular dependencies and non-coplanar geometry fail before committing a model. The original model remains available.

Validation: `node tests/smart-dimensions.mjs` checks dependency resolution and actual OpenCascade solids/STEP. `node tests/smart-dimensions-ui.mjs` exercises canvas selection, numeric editing, pinning, parent resize, undo/redo, reload, annotation placement, visibility, units, SVG and touch layout with the built application. Both run in CAD PR validation; browser coverage also runs against production.
