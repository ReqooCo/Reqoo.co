# SHOP CATALOG V1

The customer-facing catalog reads only products whose status is `active` from the Core Product service.

Draft, hidden, out-of-stock and archived products are not shown in the public catalog.

The public catalog never calculates or displays internal cost, margin, pricing rules, admin notes, production instructions, or referral commission.

Product detail pages must load the selected product and render its dynamic variations, custom fields and add-ons from the Core Product definition. Customer input is captured as an order customization snapshot at checkout.

This catalog is intentionally separate from the legacy Shop page while V1 is validated. No legacy shop/payment code is modified by this step.
