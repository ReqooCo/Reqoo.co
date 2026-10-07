# REQOO app directory

The app directory is `/apps/`. It groups existing routes by the user's task without moving app folders, databases or browser storage. Keep root homepage focused on shopping; its App link opens the directory.

| Group | Canonical entry points |
| --- | --- |
| Shop | `/shop/`, `/tumbler/`, `/plaque/`, `/shop/?q=brooch` |
| Belajar | `/sim/pksk/`, `/sim/pksk/access/`, `/play/` |
| Kerja | `/lra/`, `/s2/`, `/ot/`, `/ot-share/` |
| Studio | `/laser-price/`, `/pricemaster/` |
| Demo | `/bisnesflow-demo/`, `/sim/industry/` |
| Admin | `https://admin.reqoo.co/` |

`/play/` links to `/play/jom-main/`, `/play/abc/`, and `/play/alam-ilmu/`.

## Compatibility

Do not delete numbered backend modules or PKSK compatibility pages based only on their names. Payment callbacks, old bookmarks and imports can still depend on them. The README describes the current PKSK V2 canonical runtime. No legacy routes are removed by this cleanup.

`shared/ecosystem.json` describes the groups. The directory is deliberately rendered as static HTML so links work without JavaScript. Update both when adding apps. Search progressively enhances it.

## Offline ownership

Each service worker deletes only cache names with its own prefix. OT and OT Share use distinct prefixes (`ot-air-selangor-v` and `ot-air-selangor-share-v`). Offline fallback belongs to the same app and is returned only for document navigation, never for missing JS/images. Cross-app navigation and API requests are left to the network.

Run `node tests/app-cache-isolation.mjs` after changing any service worker. Existing installed copies need an online visit so their service workers can update.

## Remaining audit scope

Payroll formulas, payment confirmation, permissions behind login, customer data, mobile device/offline acceptance, and unused legacy-route removal require separate verification. This cleanup does not change salary defaults, staff presets, authentication, database schemas or actual work records.
