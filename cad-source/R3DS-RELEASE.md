# R3ds — recovery, sketch navigation and workspace refinement

The app is now branded **R3ds — REQOO 3D Studios**, with a graphite workspace and restrained red wordmark accents. Existing `/cad/` URLs, `.rqcad` files, native feature recipes and `reqoo-cad-v1` storage identities remain compatible.

## Functional changes

- Failed project restore shows persistent recovery controls. Autosave is blocked until the user restores a valid backup, opens a valid project, or explicitly confirms a new project. Original data can be downloaded and is quarantined when storage allows. Failed backup restore preserves recovery state; restore does not replace the good backup with corrupt data.
- Sketch touch navigation is handled independently of single-finger OrbitControls. Two fingers pan/pinch on the active plane; adding the second finger cancels the draft and rolls back any provisional polyline vertex. Releasing a finger does not resume drawing accidentally.
- Changing sketch tools within the current session preserves camera position, target and zoom.
- Tap an existing sketch profile during drawing to select and edit its dimensions; dragging still creates profiles. Polyline point taps retain their drawing meaning.
- Rotation keeps the live rings and exact angle controls visible, with coordinate/pivot/snap options collapsed under Options. The panel avoids the utility rail and sits outside the ring's projected radius when viewport space permits.
- Dimension labels also avoid the world-origin label, sketch toolbar and utility rail. This is a targeted layout improvement, not a complete constraint/annotation solver.
- Material swatches apply the same validated PBR presets as the existing selector, including textures. No display-only material change alters native CAD volume.
- Workspace mode buttons fit all three modes; footer selection and save-state text are more readable; grid contrast is reduced. Theme and XYZ/selection semantics remain distinct from brand red.

## Regression gates

`tests/r3ds-ux-ui.mjs` exercises corrupt storage with edits, original-data download, failed/valid backup restore, reload, confirmed/cancelled new-project recovery, two-finger pan and pinch, plane/pose continuity, repeated polyline navigation without extra geometry, tap-to-select/exact dimension edits, rotation panel placement, material application with unchanged native volume, and portrait mode-button overflow. It is enabled in PR and deployed browser workflows.

Existing rotation tests explicitly open Options before changing local coordinates/pivot/snap, preserving those functional assertions. Existing native sketch → extrude → chamfer/fillet → upstream edit, transform, export/import, undo/redo and save/reopen suites remain release gates.

## Limits

This increment does not implement a general tangent/concentric sketch solver, cross-plane dimensions, general profile sweep, Section View, face-specific materials, or a full annotation collision manager. General topology-changing edits may still require reference repair. Physical iPad/Safari/Apple Pencil latency and palm rejection require device testing; Chromium touch emulation is not equivalent.

The existing OAuth/native ChatGPT integration work remains on hold and is excluded from this release. Integration tests use isolated browser projects and never send commands to the user's paired model.
