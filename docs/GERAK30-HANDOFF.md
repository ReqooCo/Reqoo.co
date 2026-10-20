# GERAK30 — sambungan projek

Updated: 2026-10-20. Canonical repo: ReqooCo/Reqoo.co, branch main.
App: https://reqoo.co/gerak30/ ; directory: https://reqoo.co/apps/.

## Resume prompt
Sambung projek GERAK30 dalam repo ReqooCo/Reqoo.co. Baca docs/GERAK30-HANDOFF.md dahulu, semak kod dan status deployment terkini, kemudian teruskan permintaan saya. Kekalkan data kemajuan dan app lain.

A new chat requires access to this repo (or the user pastes this document). This is continuity documentation, not a bypass for ChatGPT account usage limits. The workout app runs independently of chat.

## Files and verification
- gerak30/index.html, style.css, app.js: canonical buildless Malay app.
- gerak30/animations: AI-generated GIF loops, JPG pause frames, MP4 alternatives, all committed with the app.
- tests/gerak30.cjs: run `node tests/gerak30.cjs` from repository root.
- apps/index.html and shared/ecosystem.json: app directory entries.
- Local preview: `python3 -m http.server 8000`, open /gerak30/.
- Deploy: main push triggers .github/workflows/deploy.yml to Cloudflare reqoo-web. Check workflow and live response before claiming deployment success.
- Existing mocked DOM tests cover program structure, logging, set/rest transitions, load bounds, optional progression and GIF controls. They do not verify real Safari rendering. iPhone acceptance remains necessary.

## User decisions and behavior
Malay UI. Goal: muscle and core development. Equipment: dumbbells up to 30 kg EACH plus adjustable workout bench. This maximum is not a starting load. Use GPT built-in image generation only when new AI images are requested; do not outsource generation.
30-day beginner plan: 3 strength days, 3 walking days, 1 recovery day per week. Two sets by default; third set in weeks 3–4 only with readiness opt-in. Light mode one set. Weighted sets require manual completion; rest can be extended. Do not replace manual rep sets with automatic timed advancement.
GIF is default and loops automatically. Video is optional fallback choice. Henti sekejap pauses timer; Henti animasi pauses illustration independently. Mobile nav is static to avoid covering demo.

## Data and migration
localStorage key gerak30-muscle-v1: start, level, progress, done, logs, weights, measures. Logs keyed day:exercise:set:side. Never clear or rename without explicit migration. Old key gerak30 is deliberately left untouched. No backend, account sync, export/import or offline service worker currently. Domain change means old-site storage does NOT migrate automatically. Do not claim it does. Do not commit personal workout logs to this public repo.
Previous site: https://gerak30-basit.bluetick18.chatgpt.site (source revision d11647a35c463f5b1a73d753bbc2a9df3614f087).

## Evidence and limits
Guidance links ACSM 2026 resistance-training review and abdominal-exercise RCT PMID 21804427. The exact 30-day combination has not been trialed. AI demos are illustrative, not technique certification. No guaranteed six-pack or spot fat-loss claims. Bench capacity must follow manufacturer rating; cannot infer from photograph.

## Next session
1. Read this document and git status / latest main before changes.
2. Check latest deployment; do not assume this document proves production success.
3. Reproduce the user's issue and edit canonical files, preserving unrelated apps.
4. Run relevant tests; report actual verification limits.
5. Update this handoff with changes, open issues and deployment state before finishing.

At migration: source tests passed previously; new repository tests and deployment are to be checked by the migration turn. No remaining feature request beyond migration and chat continuity. Useful future option if requested: validated private JSON progress export/import.
