# REDS — LIVE SHARED HANDOFF (ChatGPT • Work • Codex)

**Single source of truth:** This file and the current GitHub state, **not** an individual chat.  
**Repository:** `ReqooCo/Reqoo.co`  
**Canonical development branch:** `reds/draft`  
**Only active release PR:** [#277](https://github.com/ReqooCo/Reqoo.co/pull/277) (`reds/draft` → `main`)  
**Production:** https://reqoo.co/cad/ — Cloudflare Worker `reqoo-web`, branch `main`  
**Draft:** https://reqoo-reds-draft.abarttrading1.workers.dev/cad/ — Worker `reqoo-reds-draft`  
**Release governance:** `AGENTS.md`, `cad-source/release-policy.json`, `cad-source/REDS-RELEASE-GOVERNANCE.md`

## Working agreement for all agents

1. At the **start of every session**, fetch `reds/draft` HEAD, PR #277 and its current CI. Check `cad-source/REDS-HANDOFF.md` and `AGENTS.md`. Do **not** trust the SHA or status written below without checking the current branch.
2. Work on **`reds/draft` only** for REDS; don't open a competing release PR, create another Draft, push to `main`, force-push, or run `wrangler deploy` directly. Retain source/history from older feature branches, bringing approved improvements into Draft.
3. Before writing, fetch the latest blob SHA. If another agent has committed since you read the file, **rebase the intended change on the latest content**; do not overwrite their work.
4. Make small reviewable commits. Run relevant unit/native/browser tests, then let GitHub Actions run **Core, Modeling and Product** on the **same exact HEAD**. Also verify the **Draft live browser** workflow and version identity before marking ready.
5. End every session by updating **this handoff file** with exact completed changes, test evidence, remaining problems and next action. Commit this file to `reds/draft`; if that moves HEAD, recheck the CI for the new HEAD before reporting success.
6. Protect existing CAD data: never delete originals, backups or history; preserve OpenCascade B-Rep and the native `.rqcad` project format.
7. **Production release is not authorised merely because CI is green.** Admin GitHub ruleset + environment secret/token separation are open in [issue #278](https://github.com/ReqooCo/Reqoo.co/issues/278). Do not merge/deploy until these controls are verified and user approval/release policy is satisfied.

## Work checkpoint — multi-body selection, named CAD tools and owner Thread model (2026-11-07)

- Reconciled PR #277 and remote `reds/draft` at `88975f6b70e0d448ca5d112685f1a0c3547fc05c` (matrix 42377547934 and canonical deployed suite 42377543860 passed). Owner supplied IMG_1357 and the actual newer .rqcad; originals remain untouched. An anonymized feature-only regression is tests/fixtures/patterned-peg-assembly.json.
- Multi-body root cause: first tap on a second part replaced selected bodies with a face before double-tap promotion. Both canvas and overlaid-face-control promotion now retain the selection snapshot from before the first tap. Explicit Multi-select bodies is visible and promotes preselected faces to their bodies; body taps toggle membership. Items selection shares the compatibility contract. New model builds clear transient tap state.
- Union/Subtract/Intersect have a tool-first body selection strip, body-only canvas/Items picks, selected count, Keep originals, Done and transactional Cancel. They also accept preselected body/face references, appear contextually for multiple bodies, and preserve filters/multi state. Subtract identifies/highlights its first target. Items can stay open during selection; non-body list items are disabled for Boolean picking.
- Tool finding: compact named menu rows replace oversized two-column cards; contextual tools retain visible names on tablet and phone. Registry updates use conventional pencil, four-way Move, Rotate, spline nodes, loop Offset, 3D Fillet/Chamfer and differentiated overlapping-body Boolean silhouettes. All commands retain accessible names and common aliases. Original REQOO SVGs, not copied proprietary assets.
- Official reference research: https://support.shapr3d.com/hc/en-us/articles/7770768736924-Selecting-geometry ; https://support.shapr3d.com/hc/en-us/articles/7873906073884-Keyboard-shortcuts-gestures-and-hotkeys ; https://support.shapr3d.com/hc/en-us/articles/7874427955996-Union ; https://support.shapr3d.com/hc/en-us/articles/7378907587484-Accessing-tools . Implemented sequential touch/body selection, tool-first Boolean entry, adaptive named actions and original CAD symbols.
- Actual file reproduces Thread failure: derived/extruded peg cylinders use reversed native axes with negative UV intervals. Thread cutter construction now normalizes its working axis while preserving saved Start/End/offset semantics. A 0.0001 mm clearance at stock end faces avoids degenerate cap edges; interior requested limits stay exact. Non-destructive fuzzy native cuts, native validity and meaningful material-removal checks reject empty, invalid or numerical no-op results. Bounded phase-aligned short spans handle difficult long sweeps. No validation bypass or mesh substitute.
- Local PASS: standard/internal/Left/Right/native-axis Thread, custom fused four-post Thread and STEP; actual four peg inputs cover 10/11 mm, Start/End, Right/Left and rounded nominal diameter, unchanged neighbouring bodies, BRep validity, project/STEP roundtrip and six-part connected Union with conserved volume. Real browser surface tap → full 11 mm Thread → Undo/Redo/reopen passed serially. Heavy parallel native/browser runs exceeded one preview timeout; serial verification passed without raising timeouts. Complex helical rebuild latency remains material and physical iPad/Pencil responsiveness is not claimed verified.
- Real touch/UI PASS: two double-tapped bodies retain both; preselected face → Multi-select → next body; tool-first add/remove/Cancel; Keep originals/reopen; Subtract target/volume; Intersect volume; actual six-part assembly selected through Items → one Union solid; readable named rows/task strip at 1180/820/390. Existing repeated Extrude/tool-workflow, focused workspace, workspace reference, Product and parameter contracts passed. Exact-head Core/Modeling/Product and canonical deployed browser/source results must be recorded in PR #277 before declaring ready.
- No Live change; #278 lock retained. Final source fingerprint and CI evidence belong in the PR comment, avoiding a follow-up source commit that restarts checks.

## Work checkpoint — Pattern badges and Sketch-to-3D transition (2026-11-07)

- Reconciled PR #277 and remote `reds/draft` at `12285b94a115aac9a72534a727a41c78718dee18`. Owner screenshots request Shapr3D-style Pattern, Thread failure on a 6.325 mm peg, and automatic Solid mode after sketch camera rotation.
- Sketch Pattern exposes directly draggable direction distance badges and quantity/centre/angle badges on the model instead of the numeric parameter dropdown. Linear supports Spacing/Total distance; Circular supports Total/Spacing angle with duplicate-turn rejection. Existing recipes without definition retain their original geometry.
- Named off-plane/corner/ISO views finish Sketch and enter Solid, retaining selected derived profiles for immediate multi-profile Extrude. Cube orbit performs the same handoff on pointer release; cancelled drags restore the camera. Pending operations and one-point unfinished paths block transition instead of silently dropping edits. Same-plane views stay in Sketch.
- Native and real UI coverage includes Total distribution on all principal planes, pending-operation protection, four patterned profiles → ISO → four immediate native Extrudes, and cube drag selection retention. Existing direct Sketch, rotation and parameter contracts passed locally; exact-head Core/Modeling/Product and canonical deployed browser evidence must be recorded in PR #277 before calling Draft ready.
- Thread remains OPEN: native four-post fused base with Custom 6.325 mm diameter, pitch 1 and full-height thread succeeds; previous standard/internal/axis/STEP cases also covered. Persistent four-post regression and STEP export/import passed locally. No geometry-validation bypass or speculative Thread fix. Current uploaded Untitled.rqcad contains only the older Trim/Offset case, not the screenshot's threaded model. Need the failing model's original .rqcad to reproduce its actual topology/history. No claim Thread is fixed; owner screenshots and original file preserved.
- No Live change; #278 release lock retained. Final checks and source fingerprint belong in the PR evidence comment.

## Work checkpoint — repeated Extrude and tool workflow audit (2026-11-07)

- Baseline reconciled with PR #277/remote `reds/draft`: `6e256808be3f3f72b777e4eb42f07ec4adad7eab`, exact-head matrix 42366093978 and canonical deployed suite 42366090330 passed. Owner AF8FD151 screenshot reports second Extrude failing and shows mixed Sketch/solid selection plus clipped/overlapping left controls.
- Root cause: canvas taps unconditionally appended previous selections across reference domains. Automatic selection now replaces incompatible old references, preserves compatible multi-profile/body and same-body edge selection, and treats automatic face replacement separately from explicit Faces/multi selection. Source/history geometry is unchanged by selection.
- Added a common entry-contract registry covering every native tool. Launch, contextual actions and direct extrusion references share the contract; native geometry validation remains authoritative. Single-source Mirror/Copy/Circular Pattern reject multiple body inputs instead of silently ignoring them; Align bounds its input pair. Open/construction profiles cannot advertise solid extrusion; native closure now governs the direct arrow even for derived Trim sketches. Invalid input cannot open an unrelated panel/gizmo or mutate history.
- Consolidated left selection layout in the final focused stylesheet, removing conflicting late rules from style.css. Context actions have usable scrolling height, filter controls avoid context/Undo and labels no longer break into individual letters.
- New real-touch cross-tool regression reproduces first/second extrusion with old selection, then face Extrude/Union, edge Fillet, next-action Move/Cancel, Undo/Redo/reopen, exact native volume/body count and 1180/820/390 dock separation. Menu-level invalid-input coverage exercises all Solid/transform tools. Full workflow inventory and evidence map: REDS-WORKFLOW-AUDIT.md.
- Local CAD, canvas gizmo, curve/Sketch parity, transform, Product, multi-profile, repeated-action/invalid-entry UI, all Extrude boolean modes, parameter contracts and release-gate/surface suites passed. Final sourceHash `95f1f5ef62ea7447`; fresh exact-head Core/Modeling/Product plus canonical Draft browser/source evidence must be recorded in PR #277. No Live change, no gate exceptions, original uploaded image/project preserved. Physical device smoothness and remaining advanced topology/constraint/export coverage are not claimed complete.

## Work checkpoint — curve editor plane ownership (2026-11-07)

- Arc/Spline commit `5cf2c77930c7322ef34d7b5272b963f1acd82bcd` passed exact-head Core/Modeling/Product (42365353176). During final review, changing a source curve's plane in History exposed an existing shared-gizmo precedence bug: selected-item plane could override the explicit edited sketch plane.
- Explicit XY/XZ/YZ recipe planes now own source Sketch gizmos; selected-item/face frames remain fallbacks where a recipe has no explicit plane. An explicit custom basis keeps priority. This aligns numeric arrows and free planar point drags with the actual native preview after a plane change.
- Regression checks conflicting XY selected-item versus XZ recipe, translated point origin and Y-to-world-Z direction, plus real curve-editor plane selection/visible arrow normal before Cancel and subsequent point/bulge editing. Source fingerprint `c3dd0013522ebe36`; fresh exact-head matrix and canonical Draft browser/source verification required after this small follow-up. No Live changes or gate exceptions.

## Work checkpoint — direct curve points and native Arc/Spline modes (2026-11-07)

- Started from verified `1eaebb5030f29d164803c602d395b1187ec32ba4` (matrix 42351702173 and canonical deployed Draft 42351696353 both passed). Reconciled concurrent Draft commits through `4411ca4d632418274964736e33d78a3dab81db6d`; retained snap-coordinate indexing and compact left selection dock/Undo clearance. No competing branch, deployment or PR.
- Arc now offers legacy Height, 3-point and Center construction in the shared strip. Both new modes resolve to the same canonical two-endpoint/signed-height native arc, preserving exact minor/major circular curves and old projects. Signed height supports either chord side; zero/collinear input rejects without committing. Preview samples match native geometry on XY/XZ/YZ. Center mode projects the third pick onto the chosen radius and sweeps counterclockwise.
- Spline has Fit and Control modes. Control uses native clamped cubic B-spline poles; closed Control uses one periodic native B-spline with a continuous seam, rather than a straight closing segment. Fit retains the prior approximation/closing behavior for compatibility. Both preview and commit use the same native recipe; Control shows a guide polygon.
- Selected source Arc/Spline exposes Edit points. Endpoints/fit/control points and Arc bulge drag directly in the sketch plane, sharing the native gizmo preview queue, Apply/Cancel transaction and hidden backing form. Numeric X/Y remains available in the compact on-model editor. Spline points can be inserted/removed in the shared strip; this edits defining points and may reshape the curve (not shape-preserving knot insertion). History uses the same controls and downstream rebuild. No extra settings panel.
- Fixed chord-relative bulge direction and translated-point handle positions, point-editor input collapse at phone widths, and gear icons being added to simple choice labels. Curve plane/type use compact selects; duplicate point-axis buttons hide when the coordinate picker already exposes X/Y.
- Local verification: native signed minor/major/center Arc lengths and sampled native-preview distances; exact Control poles, periodic seam continuity and extrusion on all three planes; Control Spline → native Trim → exact 1 mm Offset; Save/Open and invalid recipes. Browser checks actual touch Arc construction, collinear rejection, touch endpoint and mouse bulge drag, preview immutability/cancel/Apply, Undo/Redo, Control creation, point insertion/removal and 1180/390 input width/screenshots. Existing native parity, project IO, parameter frames, expanded Sketch parity, direct Sketch, canvas gizmo and active-sketch suites passed during implementation. Final merged Product and fresh exact-head CI/canonical Draft evidence must be recorded in PR #277 before declaring ready.
- Merged sourceHash `36ed2906e9e68840`. Remaining: fit-point tangent/curvature handles and smooth Fit closure, tangent continuation/cross-entity constraints, shape-preserving spline insertion, normalized upstream topology references, mixed hole-loop offsets and spline/ellipse DXF. Physical iPad/Pencil smoothness unverified; no complete Shapr3D parity claim. Live unchanged, #278 lock retained.

## Work checkpoint — native-preview readiness synchronisation (2026-11-07)

- Full CAD suite passed after compact constraint repair, including constrained polyline solve/extrude/conflict preservation and phone controls. Published repair as `4b74cfdc4f9e0a2539387354743f4ca5b5a5020e`.
- Canonical deployed Draft run 42351480577 found an asynchronous readiness race: native Offset preview was valid before the next animation frame updated the visible Apply button. Shared gizmo now refreshes the visible state immediately on native completion (same session/epoch only). The browser test waits for both native validity and the actual enabled Apply control before asserting eligibility and committing the native Offset. No geometry check or operation was removed.
- Fresh sourceHash `9aaa5392dcec5f4e`. Focused curve-system/Offset and generic gizmo browser tests precede push; final exact-head Core/Modeling/Product plus canonical Draft browser verification remain mandatory. Record final outcomes in PR #277. Live unchanged; #278 lock retained.

## Work checkpoint — compact polyline constraint selection (2026-11-07)

- Published preceding work as `5e3b3bd570c7bae5e9b0daa104a5b4a175f03b8d`. Exact-head Core and Product passed in 42350791820. Modeling caught a genuine regression in the test adapter: compact parameter selection tried to select a checkbox key (`lock:0`) in the numeric dropdown, so the full CAD constraint flow timed out.
- Adapted the real-control test helper to select the owning point before its Lock/Direction choices. Fixed the UI itself so choosing a segment length also changes the active constraint owner to that segment. Added an assertion requiring the selected segment's Direction choices to be visible. The resumed test also exposed overlapping constraint groups: their hidden/flex styles had depended on the old parent. Restored hidden-group semantics, nonshrinking choices and one horizontally scrolling compact strip, including the real Solve/Clear commands. No validation was skipped or weakened.
- Fresh sourceHash `964d6382bd392164`. Re-run full CAD constraint/solid/save/open test and exact-head Core/Modeling/Product plus deployed Draft checks before calling ready. Final run evidence belongs in PR #277. No Live change; release lock retained.

## Work checkpoint — unified sketch gizmos, native tools and cube planes (2026-11-07)

- Baseline reconciled with PR #277 and remote `reds/draft`: `2a4cbc55bab1ebabebc69a51acb0ea71cc7e3a35`. Owner explicitly authorized pushing after the earlier compact-UI checkpoint. That commit deployed, but Product/browser overlap validation failed; the dimension obstacle solver now finds a free position against all controls together.
- Fixed the general native curved-intersection Trim failure: adjacent fragments of the same circle/ellipse now use finite analytic parameter contacts before the general OpenCascade intersector. Preserved true-overlap rejection and native curves. Anonymous regression fixture reproduces the uploaded eight-feature history; 96 further arc picks, touch Trim, Undo/Redo/reopen pass. Original uploaded project unchanged.
- One shared on-model gizmo now owns Offset and sketch operation parameters; choices use the compact Sketch strip. No separate Offset settings panel. Added native Mirror, Move/Rotate about geometry centre, linear/circular Pattern, linked Project, real vector Text, selected/all-corner Sketch Fillet and Chamfer. History restores hidden consumed corner inputs for editing. Text uses a lazily loaded bundled Latin font with retained counters and native extrusion; font and icon licences included.
- Replaced scattered action icons with a shared conventional SVG registry. Extended non-pickable world XYZ axes across the viewport. Principal-plane picker now presents three coherent cube faces sharing the origin, preserving exact XY/XZ/YZ frames.
- Solid preview queue displays completed native intermediate geometry while a newer request is pending, without committing history. Latest native verification controls Apply. Taper angle, invalid-angle rejection, Undo/Redo and cancellation of late Fillet results are browser-tested.
- Final local checks: fresh production build (sourceHash `016c6adb247489d8`); native Trim plus new Sketch tool suite (three planes, native fillet/chamfer, mirror/pattern/move, text/extrusion/counters, linked Project/upstream edits/roundtrip); expanded Sketch parity browser; original-history corner edit; canvas gizmo; active-sketch; direct-sketch; motion continuity/Taper/native preview queue; release-gate/deploy-surface checks. Product and exact-head CI/deployed checks are required after publication; record their final evidence in PR #277 without another handoff-only commit.
- Remaining boundaries: no complete Shapr3D parity claim. Advanced Arc/Spline handles, mixed hole offsets, normalized topology references and spline/ellipse DXF remain unfinished. One Latin text font; physical iPad/Pencil smoothness not verified. Live untouched; #278 lock remains false. Publish only through existing `reds/draft` and canonical Actions, never direct deploy.
- Next: push this checkpoint, inspect exact-head Core/Modeling/Product and canonical Draft browser/source identity, and fix any genuine failures before calling Draft ready.

## Work checkpoint — compact Sketch presentation (2026-11-07)

- Baseline verified `f574c71472850dae370390e24cf92d7fd7edf802`, PR #277 still the sole open Draft; its CAD matrix passed (42316050907). Owner screenshot F7C5F01C shows duplicate W/H controls, wide instruction panel, persistent snap badge and origin/axis label congestion.
- Removed the separate rectangle exact-size HUD and its per-frame synchronization. The attached native sketch dimension inputs now own size editing for both newly drawn and reselected profiles. Existing geometry validation, rebuild, history and constraints path retained; UI tests target this real editor.
- Sketch task strip now shows only tool/plane, start-mode dropdown when relevant, and Exit (plus existing Trim Done). Full instruction remains available in the strip accessible label/title. Drawing hides the unrelated Selection dock. Attached editors and snap feedback use smaller neutral surfaces with 16px editable input text for touch usability; completed primitive drag clears stale snap feedback.
- Dimension layout now moves labels sideways away from vertical rails and to the nearest side of horizontal obstacles, rather than lifting every collision above the whole toolbar. Sketch tools scroll above phone Undo/Redo. A world-axis label pointing into the camera hides when it projects onto origin; the actual origin and all world axes remain.
- Local validation: production build; project IO; expanded native Sketch parity (25 curve pairs, derived/linked Trim and Offset); Sketch parity browser (Trim/Offset/Undo/Redo/reopen); direct Sketch browser (three planes, touch size edits, native Extrude/Chamfer/upstream edits, Undo/Redo/reopen); R3ds UX; Sketch regions; Product browser; release gate/surface tests. Final responsive screenshot assertions cover the reported 23 x 19 rectangle at 1180, 820 and 390 pixels, one-row task strip, one pair of dimensions, rail/control separation and projected axis labels.
- Publication blocked: automatic approval review rejected the combined fetch/commit/push command as a consequential remote mutation requiring explicit user authorization. No remote write or deployment occurred. Changes are prepared locally; obtain explicit approval before pushing to the existing reds/draft branch.
- Fresh exact-head matrix and canonical deployed Draft identity/browser verification required after push. Do not infer new-commit success from baseline. No production changes; #278 release lock retained. Physical iPad/Pencil testing remains pending; no complete-tool/Shapr3D parity claim.
- Next: inspect this commit's CI and Draft screenshot/source identity, then continue remaining native Sketch audit items.

## Work checkpoint — unified native Trim and deep sketch audit (2026-11-07)

- Baseline `9dd0699efaac87ed173fbea3de8956750c456f3f`: exact-head Core/Modeling/Product PASS 42305090178; canonical Draft PASS 42305080892. Owner IMG_1346 reports Arc/Spline mismatch and unsupported curve boundary Trim.
- Replaced the app's shape-specific Trim dispatch/mutation with one native `sketchTrim` history feature. Original input recipes remain intact. Native finite intersections/parameters/splitting now support line, arc, circle, ellipse, spline, spline self-intersections, and derived/native outlines. Rectangle vertices bound intervals; analytic circle/ellipse seams do not. Coincident selected intervals and ambiguous picks reject, while unrelated overlap does not block an unambiguous edge.
- Native planar curves are read through OpenCascade p-curves in the sketch frame, preserving analytic, B-spline/rational and offset-curve geometry. This fixed the additional Ellipse → Offset → Trim failure found during the audit. Original constraints and upstream source history remain, rather than being erased.
- Arc now previews the curved native geometry and exposes editable attached height. Spline preview uses the same native fitted curve as commit in the worker, with one running/latest pending request, session invalidation, no project payload, and explicit native resource disposal. Canvas long-press text callouts suppressed; inputs remain editable.
- Fixed serialized drawings bypassing later operations. Trimmed open curves can enter Offset; standalone spline fallback fits an OpenCascade offset curve to a B-spline at 0.00001 mm tolerance. Native Trim SVG and line/circular-arc DXF export preserve the existing export path; spline/ellipse DXF remains explicit unsupported.
- Local PASS: production build; 25 sampled target/boundary pairs; principal planes; looping spline; derived/projected targets; vertex/source immutability/coincidence checks; minor/major Arc preview; Spline→Trim→Offset (1 mm distance samples); Rectangle/Circle/Ellipse/Spline/Arc→Offset→Trim; native exports; complete expanded sketch browser suite including touch, native preview, height editing, native curve types, Undo/Redo/reopen/offset eligibility; full CAD/Product/file UX browser suites; native sketch/IO/constraint suites and whitespace check.
- Full source/research findings and remaining work: `REDS-SKETCH-DEEP-AUDIT.md`. This is not all-tool/Shapr3D parity. Three-point Arc/direct bulge and spline Control Point/direct handles remain; normalized references after upstream geometry changes, constraints/closure policy, dense selection, export coverage and physical iPad profiling remain incomplete.
- Fresh exact-head Core/Modeling/Product and canonical Draft identity/browser runs required after this commit. No Live changes; #278 lock retained.
- Next: retrieve fresh CI/Draft outcomes, fix failures, then continue the explicit remaining items in the audit without claiming all tools complete.

## Work checkpoint — multi-profile Offset and snapping lag (2026-11-07)

- Baseline Draft/PR #277 `ddd9e07ebda02a5ccb779532b99181bcaf7e149b`: Core/Modeling/Product PASS 42300023496; full canonical Draft PASS 42300018226. Owner IMG_1343/1344 reports multiple Offset unavailable, arc showing zero selected and lag.
- Root causes: Offset selection replaced the previous profile, only one input was allowed, and open arc eligibility was missing. Chain now expands through endpoint-connected source profiles on the same plane, preserving analytic curves. Disconnected selected groups apply in one rebuild/history transaction. Single mode retains one source. Closed native chain results and standalone open arcs can be offset again.
- Native chain assembly orders/reverses exact 2D curves, rejects disconnected/branched graphs, and uses OpenCascade offsets for mixed closed and open wires. Closed outputs remain extrudable B-Rep faces. Existing single-profile and annular circle workflows retained. Native outlines with holes reject rather than silently dropping inner contours.
- Lag: geometric guidepoints/intersections were recalculated for every pointer movement. Added a bounded last-result cache keyed by actual items, sketch plane, visibility, isolate selection and draft points; released on sketch exit. Browser regression requires 20 unchanged pointer moves to reuse cached intersections and geometry edits to invalidate them. This proves removal of repeated work, not physical iPad frame-rate parity.
- Local PASS: build; native mixed line/arc YZ chain, reversed inputs, open chain, repeated chain, standalone arc, exact extrusion/project roundtrip, hole preservation rejection; existing native Trim/Offset/linked projection; expanded browser suite for touch connected-chain selection, repeated offset/reopen, multi-profile batch/one Undo, cache reuse/invalidation; active-sketch touch Offset; project IO, constraints and sketch-edit geometry; diff checks.
- Fresh exact-head Core/Modeling/Product and canonical Draft browser verification required after push. No Live change. #278 lock remains. Derived Trim, branching chain choices, multiple hole-loop offsets and physical iPad performance remain incomplete.
- Next: inspect the new exact-head CI/Draft results, then validate the owner's real model/device before claiming the reported lag fully resolved.

## Work checkpoint — tool state relationships and Shapr3D layout research (2026-11-07)

- Baseline Draft/PR #277 `08d0973e43d7fd10fda6a7915a89b5b39837c1b4`: exact-head Core/Modeling/Product PASS 42277531241; full deployed Draft/source identity PASS 42277523268. Live unchanged.
- Owner screenshot IMG_1341 exposed drawing Start Center leaking into Trim, duplicate top/bottom Trim instructions and ambiguous Exit controls. Research uses official adaptive UI, visual refresh, Trim and Constraint Settings documentation; findings and tool boundaries recorded in `REDS-TOOL-RELATIONS.md`.
- Shared sketch-state refresh now hides drawing-start and rectangle-size controls during editing, closes old tool HUDs, clears old snapping feedback and restores appropriate navigation. Trim Done lives in the single sketch bar beside the sole visible Exit sketch; Done returns to Select. Offset/Profile Apply or Close returns to Select, avoiding accidental drawing and stale tool hints. Switching Trim→Select clears Trim controls.
- Added browser transition coverage Draw→Trim→Select→Offset→Close→Draw Circle→Trim→Done→Trim; original native Trim/Undo/Redo/reopen, Single/Chain offsets and upstream linked face projection assertions retained. Added desktop/390px screenshots and non-overlap assertions for Done/Exit.
- Local validation: production build, active-sketch touch Offset/session cancellation, direct-sketch native Extrude/Chamfer/upstream edits/Undo/Redo/reopen, sketch-edit geometry and native parity, project IO, constraints, sketch stroke and diff checks passed. Enhanced parity run PASS, including desktop/phone control non-overlap and tool transition checks; fresh exact-head CI/Draft still required before declaring ready.
- Known boundaries: derived Offset/Fillet/Profile Trim remains incomplete; no Shapr3D parity claimed. Symmetric dimension-label congestion and phone rail density remain follow-ups. Physical iPad/Pencil unverified. #278 release lock retained.

## Work checkpoint — precision snapping browser coverage (2026-11-07)

- Start verified Draft HEAD `aafc21f25890cd420145425ab0f88ce8de372ec9`; PR #277 remains the canonical Draft. CI/Draft runs 42276901522/42276892792 were still in progress at inspection; no green status inferred.
- Reproduced the Product precision failure from prior run 42276664145: old assertion expected the entire snap marker group hidden when Show guides is off. Updated it to require a visible point marker with the optional guide line hidden and hint independently hidden. Actual coordinate snapping and preference reload assertions retained.
- Added real canvas hover checks for circle centre, finite line midpoint and interior line intersection, requiring correct snap kind plus visible marker/hint. Crossing fixture is asymmetric to avoid editable dimension labels occupying the pointer target; dimension-label congestion around symmetric intersections remains a UX follow-up.
- Local PASS: complete precision UI (snap settings, hidden targets, local/world transforms, face pivot scaling, concentric native alignment, Undo/Redo/reload, anchors, tablet/phone); transform UI; pattern/thread UI; pen/touch input; workspace reference UI; focused workspace UI; direct sketch UI; guidepoints and native sketch-edit/trim/offset/projection regression suites; diff whitespace check. Existing previous-session CAD/Product/file/active-sketch tests remain passed locally.
- Fresh final-head Core/Modeling/Product and deployed Draft still required after this commit. Physical iPad/Pencil unverified. Live untouched, #278 lock unchanged.
- Next: inspect exact final-head CI and Draft browser results; fix any remaining failures before declaring Draft ready.

## Work checkpoint — snapping priority and failing browser regressions (2026-11-07)

- Started from verified Draft/PR #277 HEAD `b4ee7113d42b42f88a8105df7ee145b00977d736`. Both exact-head workflows failed: CAD matrix 42267926728 and Draft browser 42267916785; these are failures, not pending results.
- Reproduced `tests/cad.mjs` failing before browser startup: midpoint assertion used the world origin, where the intended origin priority deduplicates the midpoint. Test now checks a separate finite line midpoint at x=30 and retains the origin-priority assertion.
- Fixed actual snapping bug: coincident guidepoint deduplication now uses the same origin/intersection/endpoint/centre/midpoint priority as nearest-point selection, independent of feature order. Added centre/midpoint/intersection, reordered overlap, hidden/off-plane regression tests to the existing native snapping suite.
- Reproduced Sketch parity browser failure after successful Trim: Offset tests still searched the removed operationGizmo fields. Updated Chain/Single distance/type interactions to the actual accessible Sketch edit HUD controls; kept duplicate-panel rejection and native bounds assertions.
- Local PASS: production build; full `tests/cad.mjs` desktop/phone native browser suite; `tests/reds-sketch-parity-ui.mjs` touch Trim + Undo/Redo/reload + Chain/Single Offset + linked face projection/upstream rebuild; transform-snapping/guidepoints; sketch-edit-geometry; sketch-native-parity; project-io; constraints; sketch-stroke; diff whitespace validation.
- Follow-up local PASS: `tests/product.mjs` and `tests/sketch-file-ux-ui.mjs`. Also reproduced/fixed the same removed Offset panel locator in `tests/active-sketch-edit-ui.mjs`; that touch-offset/native-annulus/session-cancel regression now PASS.
- Final commit still needs fresh exact-head Core/Modeling/Product and canonical deployed Draft verification. Other earlier matrix failures have not yet been independently diagnosed. Physical iPad/Pencil remains unverified. Live untouched, #278 remains open and release lock unchanged.
- Next: inspect fresh exact-head Actions failures, fix remaining real errors, then verify canonical Draft source commit/hash and complete browser run.

## CI diagnostics 2026-11-07

Draft workflow now records each browser test name, duration, and exit status. A 300-second watchdog limits hung tests while preserving failures. Full CI results remain unverified; no Live release.

## Checkpoint — sketch snapping (2026-11-07)

- Draft-only updates: true finite line midpoints, line-line interior intersection snapping, out-of-plane intersection rejection, deterministic priority at overlapping snap locations, and visible point markers even when optional guide lines are off. Existing centre, endpoint and origin snaps retained.
- Browser/native tests and deployed Draft identity have **not yet been verified** for these changes. Follow-up: regression coverage for centre/midpoint/intersection, save/reopen, touch and performance; exact-head Core/Modeling/Product and Draft browser checks. Do not claim completed Shapr3D snapping parity.
- Release issue #278 remains open; `liveAccessRestricted=false`. No production merge or deploy.

## Checkpoint — Offset UI and tablet regression (2026-11-07)

- Draft only. Removed duplicate Offset parameter gizmo; one `#sketchEditHUD` now owns distance, Chain/Single and Apply/Cancel. Added nonzero finite offset-distance validation. Canvas edge tapping now targets the precise selected polyline for both Chain and Single; Single records segment index. Sketch dimensions are hidden while an edit tool is active. Compact selection dock and familiar parallel-line Offset / scissors Trim glyphs replace overlapping controls.
- Updated Sketch parity Playwright regression to use `#sketchEditHUD [data-apply]`, verify the duplicate `#operationGizmo` is hidden, and exercise touch selection in Chain mode. These changes are committed, but browser CI and physical iPad verification are **not yet confirmed**; do not call them passing.
- **Known limitation:** Chain offsets segments belonging to one connected polyline feature, not arbitrary independently created lines. Do not claim full Shapr3D Offset parity. Further work: cross-feature chain topology, live drag preview, undo/redo/save/open and actual Draft browser tests.
- Release lock remains in force: #278, `liveAccessRestricted=false`; no Live merge/deploy.

## Current checkpoint — circular Sketch Trim (2026-11-06)

- Starting Draft/PR #277 SHA: `8f0c146a22fb3f06befdec1fb9d0c2f6b9fdc11e`. Its exact-head Core/Modeling/Product and full deployed Draft suite all PASS: runs 42241094535 and 42241082718. Scoped Draft token works without account-wide Workers permission.
- Owner asked to resume CAD work while remaining release security blockers stay locked. This commit adds exact analytic circular/arc Trim: tap a circle or arc between line/rectangle/circle/arc intersections; remaining geometry is stored in the existing native arc recipe, including major arcs and repeated Trim. Straight lines also respect finite arc boundaries. UI hit testing now admits circular edges in Trim only; normal Single Offset edge selection remains straight-only.
- Geometry remains OpenCascade B-Rep: native tests verify a trimmed semicircle has one circular edge and exact bounds. Regression tests cover half/quarter/major remainders, repeated trim, line vs finite arc, coincident circle rejection, source immutability and unsupported ellipse-boundary rejection. Browser coverage includes touch circle Trim, Undo/Redo, reopen and repeat Trim to quarter arc; existing offsets and linked projection remain covered.
- Limits: ellipse/spline Trim remains incomplete, circular Trim against unsupported curve boundaries rejects rather than guessing. Existing dependency/constraint guards remain. Fully editable linked projection, comprehensive constraints and physical iPad/Pencil validation still pending. Do not claim Shapr3D parity.
- Security status: #278 OPEN, liveAccessRestricted=false, PR stays Draft. Live token ID c947450a56fcf3566c760c9c2368b490 is distinct and verified scoped to exact reqoo-web/reqoo-catalog-api tags, plus Zone Read/Workers Routes Write only for reqoo.co. Owner reports env secret installed. D1 migration permissions and actual Live token runtime validation are unresolved; old broad credentials, Pages alternative publisher and external-client permissions/real denial tests remain blockers. Connected OAuth cannot update granular token policies (HTTP400/code1001); no Live deploy or token revocation performed.
- Validation for this commit: local geometry/native/project-IO/constraints/build and Sketch browser tests; final exact-head Core/Modeling/Product + deployed Draft results must be retrieved after push. Final run evidence goes in #278/PR rather than recursive handoff-only commits. Next CAD action: continue curve safety/UX and editable linked face projection after verifying this Draft.

## Previous checkpoint — scoped Draft token verification (2026-11-06)

- Inspected PR #277 HEAD `ebf7f53a7e117743eb3a5148e1a736a7ee7a67a0`. Core/Modeling/Product passed: run 42235356677. Draft full browser suite passed in run 42235349989 attempt 1 using the older credential.
- Owner created Account token `REDS Draft Deploy` (ID `9b46b904c086abe5aa4f15364af0693b`), independently verified active and restricted to the exact Draft Worker tag `5d3251aa17374233a6745c476020e555`, Individual Workers Editor only. Owner stored it in reds-draft environment as CLOUDFLARE_API_TOKEN. No token value captured in chat/source.
- Real rerun 42235349989 attempt 2, job 127967828174: scoped token uploaded Draft successfully, but Wrangler 4.129.0 deploy failed on account-wide /workers/subdomain lookup (10000). Browser tests did not run. This is NOT a green scoped-token deployment.
- This commit replaces Draft full deploy with supported versions upload + exact version 100% deployment. Canonical Actions helper touches only the existing Draft script, keeps workers.dev enabled, disables per-version preview URLs, verifies active version and subdomain settings, then existing exact-commit browser suite runs. No account-wide permission added; upload/deploy failures remain fatal. Mock regression tests cover wrong branch/repo/event/client, denied API, failed upload and wrong active version.
- Main ruleset now independently verified approvals=0 and last-push approval=false for owner-confirmed solo mode; required PR, strict three Actions checks, force/deletion restrictions and empty bypass remain. Live still requires final owner environment approval.
- No Live deployment or credential revocation. #278 remains OPEN, liveAccessRestricted=false. Still pending: Live credentials, broad-token consumer migration/revocation, Pages alternative publisher and external-client boundaries, real negative enforcement tests. Do not broaden Draft token or flip the policy lock to pass CI.
- Local scoped-deploy tests, release-gate tests and surface audit run for this change; fresh exact-head Core/Modeling/Product and canonical Draft browser results must be checked after commit. Final observed run evidence goes in #278 to avoid recursive handoff commits. Next action: verify new pipeline with the actual scoped token, then complete remaining owner-only credential work.

## Previous checkpoint — solo operator continuation (2026-11-06)

- Starting/current inspected remote HEAD: `3a282fb58deda6b554e12d75b36defc95b2693da`; PR #277 open Draft, no merge. Its Core/Modeling/Product and actual Draft suite passed at https://github.com/ReqooCo/Reqoo.co/actions/runs/42226818598 and https://github.com/ReqooCo/Reqoo.co/actions/runs/42226808947.
- Owner confirmed only `ReqooCo` operates the repository and authorised continuation after choosing automated validation + final owner deployment approval. Updated code/policy/docs to the **solo-owner** model, replacing the earlier independent-human-review plan. This is an explicit policy change for solo use, not equivalent independent review and not a test bypass.
- Added real GitHub approval-history verification for the exact canonical Live workflow run, repository, owner user ID/login, environment and SHA. Preflight is a separate no-secrets job before the protected owner-approval job. Production job retains the full gate and source/CI/Draft checks; unresolved requested changes still block it.
- Retired `provision-rebuild-d1.yml` remote provisioning path in Draft; normal migrations remain in deploy.yml. Historical branch copies still require credential migration/revocation; source history preserved.
- Branch rulesets are now API-verified: main 26698974 and Draft 26699119, active, exact branch targets, no bypass, force/deletion blocked. Main currently retains approvals=1 and last-push approval; sole-owner follow-up requires approvals=0 and last-push approval=false while retaining required PR, strict three checks and other protections.
- Owner screenshots show configured Live environment main-only, sole reviewer ReqooCo, self-review permitted, no admin bypass; Draft environment reds/draft-only, no reviewer/timer/admin bypass. Environment admin API and secrets are still inaccessible to this connector. Owner screenshot save banners are evidence, not a complete independent API audit.
- `release-policy.json.rules.liveAccessRestricted` remains **false**. #278 still open. No Live deploy, token creation/revocation, or main push in this session.
- Local release-gate tests cover absent/wrong-owner/wrong-user-type/wrong-environment/rejected/forged-run/wrong-SHA/wrong-workflow/API-denied approvals, missing run ID, successful solo approval without PR self-review, source preflight, legacy independent review and all previous checks. New commit requires fresh exact-head matrix + Draft verification; final results will be recorded on #278 to avoid a documentation-only commit cycle.
- Consolidated owner-only operations in `cad-source/security/OWNER-ACTIONS-278.md`: solo PR settings, two least-privilege environment tokens, then migration/revocation of broad old credentials. Other unresolved agent/security work includes gated Pages production replacement, external-client permissions and real negative enforcement evidence. Do not mark #278 complete or flip the lock merely because checks pass.
- Next concrete action: owner completes only the consolidated admin/secret tasks, while agents preserve one Draft and finish the remaining deployment-boundary audit. Sketch curves/editable linked projection and physical iPad/Pencil parity remain unfinished; native geometry is unchanged by this security session.

## Historical checkpoint — superseded where it conflicts with current checkpoint

## Latest verified context (2026-11-06, before this handoff commit)

| Item | Evidence / status |
|---|---|
| Draft PR | #277 is open and Draft; latest inspected SHA `8a2012f33c2738c9c91a65604779e011a269db38` |
| PR CI | Core, Modeling, Product: passed at that inspected SHA. New commits require fresh CI |
| Deployed Draft | Source SHA matched the inspected PR; separate Draft Worker is functional |
| Production | Main has NOT been merged with #277. Existing live version is left alone |
| Cloudflare Pages | Production `main`; automatic preview only `reds/draft` |
| Legacy previews | Public subdomains for `reqoo-cad-preview` and `reqoo-reds-sketch-preview` disabled; source/history preserved |
| Release-gate policy | `scripts/reds-release-gate.mjs`, mock bypass tests, and deployment-surface tests are in branch |
| Admin security | GitHub repository rulesets absent in latest check; Cloudflare token separation not verified; #278 is open |

### What REDS Sketch work exists in Draft

- Shapr3D-first (original REDS UI) direct Sketch plane/face selection.
- Straight-segment Trim with exact line/rectangle/circle/ellipse intersection boundaries, plus Undo/Redo, overlap and dependency safety.
- Sketch Offset Single/Chain for supported straight open profiles, with native B-Rep feature rebuild; existing closed-profile offset remains.
- Contextual Project Face → linked planar B-Rep sketch.
- Dedicated Sketch comparison in `cad-source/REDS-SKETCH-SHAPR3D-COMPARISON.md`. **Partial is not parity**: editable projected sketches, curved arc/spline Trim and full constraints are not finished.
- Native and Playwright tests under `cad-source/tests/`, including `reds-sketch-parity-ui.mjs`, `sketch-edit-geometry.mjs` and `sketch-native-parity.mjs`.

## Priority queue for next agent (do this in order)

**P0 — Hard deployment security (issue #278):**
- Inspect GitHub ruleset/branch protection on `main` and `reds/draft`; enable or prepare for GitHub admin. Require PR and appropriate CI checks on Live, disallow bypass/force push/deletion.
- Verify `reds-live` and `reds-draft` GitHub Environments restrict branches and (where possible) approval.
- Separate and rotate/revoke the broadly scoped Cloudflare deployment token. Do not break unrelated REQOO workers, payment gateway or D1 deployment; migrate credentials safely.
- Check for **any** remaining GitHub Actions/Cloudflare direct production publishers, including historical branch workflows and service accounts. Testing the release gate alone is not enough.
- Document the **actual verified settings**, permissions, and whether an admin action remains required. Never invent success.

**P0 — Draft QA and release confidence:**
- Verify Draft URL source hash and **latest HEAD**. Run the live Playwright suite; collect failing test name, exact stack and screenshot artifact. Fix the real cause rather than skipping tests.
- Test Sketch Draw → Trim → Offset → Project Face → Edit source → Undo/Redo → Download/Save/Open, on desktop and 390px mobile, with B-Rep geometry correctness and no destructive recovery errors.
- Confirm no silent face reference ambiguity and no regression in current production workflows.

**P1 — Remaining Sketch parity:**
- Implement reliable curved Trim (arcs/splines) and meaningful fully editable projected sketch relationships only after investigating and testing actual geometry dependencies.
- Finish direct dimension/constraints, construction and closed-profile behavior. Keep the Shapr3D interaction **simple by default**: one contextual tool and gizmo per operation; no clutter/floating control sprawl.
- Physical iPad/Pencil testing remains unverified; do not assert it was completed.

**P1 — Track related reliability issues:**
- [#273](https://github.com/ReqooCo/Reqoo.co/issues/273): ambiguous topology reference (no silent guessing).
- [#274](https://github.com/ReqooCo/Reqoo.co/issues/274): reported saved-file Open failure needs the actual failing project fixture.

## Handoff checkpoint template — keep this section updated

- **Last editor / client:** ChatGPT / Work / Codex (state which)
- **UTC updated:** YYYY-MM-DDTHH:MM:SSZ
- **Latest `reds/draft` HEAD:** full SHA (verify freshly)
- **Changed files/commits:** exact GitHub links
- **Core / Modeling / Product:** run URLs + results for exact HEAD
- **Draft live:** run URL, source SHA, and actual UX checks
- **Outstanding blocker:** reproducible evidence / issue link
- **Next concrete action:** single highest-priority task
- **Live changes:** none unless separately verified and approved

**Important:** GitHub is a shared work log but cannot automatically switch running agents when a ChatGPT or Work usage limit is reached. The user opens a new Work/ChatGPT/Codex session and gives this file/PR as the continuation point. Never claim background execution without a scheduled automation.


## Work checkpoint — 2026-11-06 (security audit continuation)

- **Client:** ChatGPT Work / Codex; starting Draft SHA `882e7e4507a5f734014555097e0509d07ce11d86` reconciled with open Draft PR #277.
- **Committed implementation:** `702846b5f77d109581a208cf9cdaba3844bd852e` — independent exact-head human collaborator approval; reject no/stale/self/bot/outside/dismissed approvals and outstanding change requests; guard every `scripts/reds-*` path, including renames; named Core/Modeling/Product checks now report on all PRs to main, auditing all changed files before allowing unrelated non-CAD branches.
- **This checkpoint's additional change:** `check-live` now fails closed for any CAD release while `release-policy.json.rules.liveAccessRestricted` remains false. The actual flag is still **false**. Code tests use a temporary policy fixture to exercise an approved scenario; no environment override unlocks real deployment.
- **Admin audit deliverables:** `scripts/reds-admin-audit.mjs` (read-only, owner credential required) and `cad-source/security/OWNER-ACTIONS-278.md` with actual API evidence, safe migration order and unresolved negative tests.
- **Local tests:** release-gate negative scenarios and deploy-surface audit PASS; native sketch editing / native OpenCascade Single+Chain offsets and linked face projection / project IO / constraints PASS; Vite production build PASS; Chromium `reds-sketch-parity-ui.mjs` PASS (Trim, Undo/Redo/reopen, Single/Chain, linked face upstream rebuild). No new curved Trim or editable linked projection implementation claimed.
- **CI:** initial SHA `882e7e4`: Core and Modeling verified PASS at run `42224170592`; Product was still running when inspected. Implementation SHA `702846b`: full CAD PR matrix started at https://github.com/ReqooCo/Reqoo.co/actions/runs/42225916643. The commit containing this checkpoint triggers fresh CI; retrieve current PR HEAD and check runs for its exact SHA before calling it green. Do not infer new-HEAD success from a previous run. Final observed CI evidence will also be recorded on issue #278 after this checkpoint, avoiding an endless documentation-only SHA cycle.
- **Draft:** prior SHA `882e7e4` was deployed by Actions and browser identity step passed; its full deployed suite was in progress. No direct Worker deploy performed by this session. Fresh checkpoint triggers canonical Draft workflow; verify final exact-head result.
- **Verified security blockers:** repository rulesets endpoint returned `[]`; main protection API 403; GitHub admin browser signed out. Environments/secrets admin operations unavailable. Cloudflare user token list 403 via OAuth; safe identity/revocation of broad deployment token cannot be completed. Account token found is D1-only and was preserved. No credentials revoked without consumer inventory.
- **Additional paths needing owner action:** Pages still auto-publishes main independently of Actions; D1 provisioning workflow consumes repository token with no environment; historical branch workflows and external agents require complete credential/app audit. Worker Builds trigger list 404 is unverified, not absence. Existing retired CAD preview subdomains and preview URLs remain disabled. All six Workers enumerated; source/history retained.
- **Negative testing limits:** code-level denied attempts verified with mocks only. No destructive direct push, production write, force-push or branch deletion attempted. Real permissions enforcement tests require owner configuration and a safe probe.
- **Next action:** owner applies and verifies GitHub rulesets/environments and per-Worker Cloudflare token migration using `security/OWNER-ACTIONS-278.md`, then runs admin audit and provides nonsecret evidence. Do not flip `liveAccessRestricted` until #278 controls are genuinely verified.
- **Live changes:** none; PR #277 stays Draft, #278 stays open. Sketch curve/constraint/physical iPad improvements remain pending behind P0; #273 topology and #274 failing user file fixture remain outstanding.


### Exact Draft commit identity follow-up

While waiting for CI at `38142ff33ae6965d83c39cb3f5543d1317742865`, inspection found `tests/live-identity.mjs` checked sourceHash but not version.json.commit. Documentation/security-only commits share the same CAD asset hash, so an older deployed commit could falsely satisfy exact-head identity. This checkpoint additionally requires the deployed version commit to match the built commit in CI (local builds retain local mode). The final commit containing this follow-up must receive a fresh full matrix and Draft browser run. Local 17 native suites, Sketch parity, file UX, active sketch editing and desktop/tablet/phone focused workspace all passed before this identity-only change. No Live deploy; admin blockers remain unchanged. Fetch final run evidence from #278 and the current PR checks.

## 2026-11-07 ChatGPT continuation — snap lookup

- Confirmed PR #277 previous head `1eaebb5`: Core, Modeling and Product CI success (run 42351702173); PR remains Draft, release lock #278 active.
- Changed `src/guidepoints.js` duplicate coordinate lookup from a linear `points.find` scan to an indexed Map; preserves snap priority, labels and world positions. Intended to reduce repeated scanning on dense sketches; no performance benchmark claimed.
- New commit `cfeb5d2` requires its own exact-head CI and deployed Draft verification before calling it passed. Live unchanged.
