# Ecosystem Data Contracts

## SHOP → SIM

When a SHOP order containing a SIM product becomes `PAID`, SHOP emits a server-side provisioning request containing only the minimum required fields: order reference, product/license type, customer reference and payment reference.

SIM creates and owns the license. SHOP does not write directly into SIM tables.

## SHOP → PLAY

When a SHOP order for a PLAY product becomes `PAID`, SHOP sends a provisioning request to PLAY. PLAY creates and owns the entitlement/player record.

## Main → Ecosystems

The main platform may provide platform-level configuration and admin authorization. It must not become a shared dumping ground for operational tables.

## Security

Secrets, API keys and database bindings remain server-side. Browser code receives only public product/catalog data and short-lived/session-safe responses.
