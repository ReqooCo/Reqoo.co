# REQOO V1 — CUSTOM SELLING PRICE ENGINE

## Purpose
The Laser and 3D Print calculators exist primarily to determine a consistent selling price for custom work. They are internal Admin tools, not customer-facing checkout tools.

## Output model
Every calculation must show:
- Estimated Cost — internal only
- Minimum Price — internal only
- Recommended Selling Price — internal recommendation
- Target Selling Price — preferred commercial target
- Final Selling Price — selected by Admin
- Margin / Profit — Admin only

## Laser inputs
- material
- thickness
- dimensions / area where relevant
- quantity
- cut length or cut time
- engraving type/area/time
- machine profile
- machine hourly rate
- electricity
- labour
- setup
- wastage
- finishing
- packaging
- pricing rule / markup

## 3D Print inputs
- material/filament
- material unit cost
- weight
- print time
- machine profile
- machine rate
- electricity
- support/wastage
- labour
- post-processing
- packaging
- pricing rule / markup

## Pricing behavior
The calculator must not expose internal cost to a customer. Admin may override the recommended price, but the UI should warn when the selected price is below the configured minimum or recommended threshold.

## Reuse
A saved calculation can be:
1. added to a quotation as a custom line item with the final selling price;
2. saved for future reference; or
3. converted into a recurring Shop Product when the business decides to sell it regularly.

## Rule versioning
Pricing rules are versioned. A saved calculation records the rule version used so historical calculations remain explainable after Admin changes pricing settings.
