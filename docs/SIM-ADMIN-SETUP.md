# REQOO SIM Admin Setup

## 1. SIM database
Apply `docs/SIM-REFERRAL-MIGRATION.sql` to the D1 database bound to `functions/api/pksk.js` as `DB`.

This adds:
- `sim_customers`
- `sim_referrals`
- `sim_referral_events`
- server-side duplicate-phone triggers on the existing `orders` table

The duplicate guard normalizes common phone formatting (`+`, spaces, hyphens and parentheses) before comparing.

## 2. Admin
Open `/admin/sim.html`.

Use the same value configured as the `PKSK_ADMIN_TOKEN` secret/binding. The page stores the token only in browser localStorage for the current admin browser.

## 3. Referral
The Admin page can filter referral code/status. It supports the existing `referrals` table if present, or the new `sim_referrals` table after migration.

## 4. Important
The SQL migration is committed to GitHub but must be executed against the actual Cloudflare D1 database. GitHub deployment alone does not alter D1 schema.
