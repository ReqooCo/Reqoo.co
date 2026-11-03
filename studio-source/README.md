# Reqoo 3D Studio 1.4.2 — shared web and desktop

Built and tested in GitHub Actions. The released v1.3.0 non-lamp generators remain; experimental Coral, Fold and related lamp generators are retired. Lamp Studio provides seven parametric mesh shapes, sliders and illustrative nozzle motion. STL/3MF export the model envelope; direct G-code export is currently the fixed P2S 0.8 mm PETG test specimen only. Physical printing and lamp hardware fit remain unverified.

Historical baseline notes follow:

# Reqoo 3D Studio 1.3.0

Offline-first Windows x64 product editor: Electron 42, Three.js, Manifold, Vite,
local image/solid workers and BM/EN UI. No licensing or Demo restrictions.

Active product IDs (preserved): keychain, nametag, plate, bookmark, qrpay,
signage, led, lamp. Automotive keychains remain removed by owner request.
All product generators now live in one sidebar: Category > Product > Mode.
The shared registry in src/generator-registry.js is used by navigation, mode
selectors and preset validation. Existing product IDs and project schema remain.
Lamp, LED, creative and image parameters reuse their existing handlers inside
that panel; hidden legacy launch IDs remain only as compatibility adapters.
Numeric random seeds are internal. The user chooses "Cuba corak lain" and saved
projects retain the chosen pattern.

There are 12 lamp forms, including bounded organic perforations, abstract shadow
patterns, recursive connected branches and a gyroid lattice. Standard lamp forms
retain strip, Bambu Kit 001 and E27 mounts; the five new patterned forms accept
Bambu/strip only. There are 16 creative modes across keychain, signage and QR,
plus the preserved base product/LED/image flows. Voronoi cells, slider parts,
lettering signs and QR housings are actual solids, not image placeholders.

Generated geometry and STL tests do not prove physical fit, scan reliability,
strength, wall thickness everywhere, optical accuracy or heat/electrical safety.
The shadow pattern is abstract, not an accurate image/text projector. QR lightbox
is a housing and separate diffuser; actual light sources/materials need testing.
Sampling cleanup rejects substantial disconnected solids; tiny positive sampling
specks are removed only below both 1 mm3 and 0.001% of generated volume. Negative
closed shells are retained as cavities. Detail limits and worker cancellation
prevent unbounded jobs; invalid geometry is rejected before scene replacement.

## Project safety
Schema version remains 4. Shared validation checks geometry attributes/indices,
transforms and JSON metadata. Supported legacy primitive geometries from versions
1-3 are staged as BufferGeometry. Unsupported parameter geometries are rejected.
Original legacy JSON is backed up under userData/project-backups before migration.
Failed restores preserve the old scene. Recovery uses five disk revisions and
skips invalid geometry; revision ordering tolerates equal/backwards clock ticks.
Migration backups are not automatically deleted.

## Build and packaging
Use Node.js 24. Existing workspace dependencies were used for this release.
Fresh-machine npm ci is NOT TESTED; dependency versions were not upgraded.
Run npm run build, then npm run desktop. npm run package builds the configured
Windows x64 portable ZIP; desktop/installer.iss is the actual Inno Setup installer.
The source archive retains work/source/reqoo-3d-studio layout for relative paths.
Old src-tauri and .github/workflows files are inactive legacy references, not the
current build route. Review them before any future approved GitHub publication.
No Git remote, cloud deployment or update service is configured by this phase.

## Tests
After building: node --test --test-timeout=300000 --test-concurrency=1 tests/*.test.js
REQOO_EXE selects a packaged EXE for dedicated-profile tests. Test mode suppresses
real slicer launch. Run sequentially because some legacy fixtures share filenames.
No printer job is sent. Installer extraction tests do not prove full in-place
upgrade/uninstall or user-data preservation on every supported Windows version.

See desktop/PANDUAN-v1.2.0.txt for workflows and limitations. Third-party/font
licenses are preserved. Graphite Pro and secure updater remain later phases.

## Fasa 1B — UI v1.2.0
Graphite Pro default / Bambu Classic optional; app theme does not alter project geometry, material colors or viewport background. Product browser preserves eight IDs with bilingual search, categories, favorites and recents. Ctrl+K uses existing toolbar commands and includes product browser; arrows/Enter supported. No cloud deployment or auto-update. Later master phases remain outstanding.

## v1.2.0 manufacturing and creative tools
Production tools in the top toolbar provide new-mesh quality profiles, measurements, uniform scale, material estimates, seeded copies, validated local preset packs, mesh-buffer/timing records and fit coupons. Creative modes extend the existing generator IDs. New fold lampshades retain the existing LED mounts. Export winding is corrected for negative transforms. Manifold is loaded on demand.

About supports an Ed25519-authenticated offline manifest and manual installer verification/reveal. There is no live update endpoint, automatic installation, cloud resource or public release. Private signing material is outside this source tree and must never be packaged or committed. scripts/sign-release.cjs requires a protected owner key path and signs an offline handoff manifest (artifact.url=null).

Bambu CLI import/round-trip and slicing are separate checks. See the release QA report for failures and NOT TESTED hardware gates. Suggested SDF/TPMS/fidget/image projection modes remain deferred pending appropriate physical/geometry validation; this release does not claim every optional master suggestion is implemented.
