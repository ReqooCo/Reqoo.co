# Visualization and textures

Choose **Visualize** beside Sketch / Solid. Select a body on the canvas, or explicitly choose **All visible bodies**. Change its material or use Texture / Scene tabs. **Done** returns to modeling.

Materials: matte, plastic, steel, gold, wood, fabric and glass. Surface finish expands roughness, metalness and opacity controls. Glass uses Three.js physical transmission. Geometry stays native OpenCascade; material changes are appearance-only, undoable document edits.

Textures: procedural wood grain, brushed metal, woven fabric, stone and checker, plus user PNG/JPEG/WebP images. Uploads are resized to at most 1024 pixels and re-encoded as embedded PNG. They stay in the saved project, are excluded from the CAD worker payload and are not included in chat bridge summaries. Up to 8 custom images / 8 MB of encoded data; Clear unused images frees unreferenced assets.

Texture tile size is in millimetres. Rotation is in degrees. Box/planar projection follows dominant surface normals; cylindrical projection wraps around body-local Z with seam correction. These are display UVs; they do not alter native topology. Box projection can show seams and does not replace custom UV unwrapping. Materials follow the first input body through history operations, including Move, Rotate, fillets, patterns and splits. A boolean result inherits its primary body's material; individual face materials are not implemented.

Scene controls: procedural studio reflection environment, Studio / Softbox / Warm lighting, background, exposure, light angle and ground shadow. The environment is generated lazily and reused. Texture resources are cached; material previews are scheduled by frame rather than rebuilding CAD geometry.

Export PNG captures the model canvas with selection outlines and helpers removed. Optional transparent background retains real alpha. Native STEP exports preserve solid geometry and do not embed these visualization textures/materials. This increment is a real-time renderer, not path tracing; there are no external HDRI imports, decals or photorealism guarantees.

Tests: `node tests/visualization.mjs` verifies data limits, material inheritance, worker-payload isolation and UV scale/rotation/seams. `node tests/visualization-ui.mjs` verifies actual render materials/maps, custom image decoding, native volume preservation, scene settings, Undo/Redo, PNG alpha, save/reload, modeling inheritance, STEP and touch layout. Existing CAD browser tests run alongside these tests in CI and live verification.
