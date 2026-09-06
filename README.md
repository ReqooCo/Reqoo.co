# REQOO.CO

## PKSK V2

PKSK simulator and student dashboard now use the V2 backend exposed at `/api/pksk`.

- Single canonical PKSK API for access, device registration, progress and dashboard.
- JSON `POST` only for client/server communication.
- Maximum 3 registered devices per license.
- Server recalculates the final result from the canonical question bank before marking a set complete.
- Set 01–50 question-bank files are kept unchanged by the backend rebuild.
- Legacy PKSK API files and legacy PKSK generator/audit workflows have been removed.

The public site and shop routes remain separate from the PKSK V2 runtime.

## Shop Admin

Shop Admin uses the same authenticated admin session as the main admin portal.
