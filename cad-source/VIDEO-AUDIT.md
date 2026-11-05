# Shapr3D recording comparison — 5 November 2026

Reference: supplied 215.63-second iPad recording, 736 × 512. Sampled every ten seconds and inspected key frames. This is a Shapr3D benchmark, not evidence of a REQOO production defect or an instrumented performance measurement. Font sizes cannot be inferred precisely from this resized recording.

| Recording | Observed workflow | REQOO assessment / action |
| --- | --- | --- |
| 10–60 s | Items visibility, orbit, cyan face selection, perpendicular sketch view | Existing Items, camera and plane workflows covered by browser regression; physical iPad/Pencil latency still requires device testing. |
| 70–110 s | Multiple circles remain in one sketch context, inline diameters, contextual tangent | REQOO supports multiple native profiles and Smart Dimensions. Found and fixed loss of Finish/Exit eligibility after switching sketch tools without drawing another profile. Added real pointer/touch session tests and full-session Cancel verification. Full general-purpose constraint solver and tangent-circle editing parity are not established. |
| 120–150 s | Extrude, Offset Face and Scale use local inline controls | Existing native operations and geometry-owned gizmos have dedicated regression suites. Do not infer equal latency from a screen recording. |
| 160–190 s | Multiple bodies, Move/Rotate, face pull, edge chamfer/fillet | Existing transform, motion continuity and parametric rebuild suites remain release gates. General topology changes can still invalidate edge references. |
| 210 s | Material browser, glossy red finish, environment/camera tabs | REQOO has body materials, textures, studio lighting, shadows and transparent PNG. Current preset selection is a compact list; visual material thumbnails and face-specific material assignment remain gaps. |

## Implemented in this increment

Finish and Exit now recognize every sketch actually present in the current session, rather than only the most recent tool's `createdId`. This preserves the workflow Rectangle → Circle tool → Finish, including the dedicated Exit action. Cancel after multiple shapes/tool changes still restores the document and history from the beginning of the session. No mesh-only modeling, document format change or unrelated chat/OAuth changes.

## Further priorities, not completed features

1. Select existing sketch entities during an active drawing session without accidentally starting another profile; distinguish edit and draw gestures clearly.
2. Dimension collision avoidance and associative tangent/concentric relationships across more entity types; surface unsatisfied constraints explicitly.
3. Visual material swatches, search and used-material grouping; preserve the compact inspector and original branding.
4. Measure pointer-to-preview and commit latency on a physical iPad with complex models; optimize based on timings. Desktop touch emulation does not prove Apple Pencil or Safari performance.
5. Extend face/edge topology stability across topology-changing edits; report broken references instead of guessing.

The comparison does not claim full Shapr3D parity or that every CAD operation has been audited exhaustively. Native/browser results and deployment evidence are reported with the change.
