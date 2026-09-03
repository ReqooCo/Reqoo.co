# REQOO Database Architecture

REQOO is intentionally split into independent Cloudflare D1 databases by ecosystem.

## Databases

- `reqoo-main-db` — main platform/admin configuration, shared customer identity references and platform-level settings.
- `reqoo-shop-db` — products, variants, orders, order items, promotions, payments and shop referrals.
- `reqoo-sim-db` — SIM licenses, access codes, device activations, attempts, progress and results.
- `reqoo-play-db` — PLAY users, game progress, levels, rewards and achievements.

## Boundaries

Each ecosystem owns its operational data. Do not put SHOP orders into SIM or PLAY databases. Do not make SIM progress depend on SHOP tables.

Cross-ecosystem actions use small server-to-server events/contracts. Example:

`SHOP payment=PAID` → issue `SIM license` through the SIM API.

The payment/order record remains owned by SHOP; the license/progress record remains owned by SIM.

## Storage

D1 is for structured transactional data. Product images, artwork uploads and large game/SIM assets belong in Cloudflare R2 or another object store, not D1.

## Admin

The Admin UI may be unified at the platform level, but each module must access only the database/API it owns. This keeps SHOP, SIM and PLAY independently deployable and reduces blast radius when one ecosystem changes.

## Migration rule

The existing PKSK D1 database is treated as SIM data. Do not mix the new SHOP/PLAY tables into it during migration.
