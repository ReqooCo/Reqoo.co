# Reqoo CAD

Independent solid CAD application at /cad/. Existing generators are deliberately not integrated.

Uses Replicad 1.2.0 with the single-threaded OpenCascade build 1.1.0 in a dedicated worker. Browser renders tessellations of the actual B-rep; exports STEP and STL from the kernel. History is a feature graph rebuilt transactionally; failures leave the previous document intact.

Implemented: numeric/drawn sketches on XY/XZ/YZ and selected planar faces, extrude, revolve, loft, round-profile sweep, primitives, booleans, fillet/chamfer, shell, planar face extension, split, transforms, patterns, measurements, project save/open, native STEP import/export and STL export. Sketch dimension parameters are exact, but this release does not implement a general geometric constraint solver. No claim of complete Shapr3D feature parity. Imported STEP data and project files are bounded and parsed as data only.

Build: npm ci && npm run build. Browser QA: node tests/cad.mjs. See THIRD-PARTY-NOTICES.txt in the built app for bundled open-source licenses and source references.
