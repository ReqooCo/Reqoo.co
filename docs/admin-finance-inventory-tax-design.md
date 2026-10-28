# Reqoo Admin — Purchase, Inventory, Profit & LHDN design (Enterprise)

Status: design specification only. Do not migrate, deploy or change production accounting without review. Existing orders, payments, quotation revisions, receipts, staff permissions and shop integration remain the source of truth.

## Navigation
Keep existing main navigation. Add within **Kewangan**: Ringkasan | Pembelian | Stok | Untung Rugi | Aset | Cukai. No second app, no duplicate orders. Malay/English selected globally, never mixed in a screen. Mobile-first, >=14px body and >=44px tap targets.

## Daily workflows
1. **Purchase**: one form for date, vendor, receipt photo/file, lines (item, quantity, unit, unit price, discounts, shipping allocation), payment method, business/personal funding, category. Defaults save as draft; confirmation posts an immutable stock/expense/asset transaction. Unique supplier invoice + supplier check warns on duplicates. OCR is optional, never required. Corrections are reversal+replacement, never silent deletion.
2. **Materials**: stocked items use quantity, unit and unit conversions (sheet, mm², grams, ml, pcs), location, reorder level and weighted-average unit cost or FIFO (choose one policy per item, document it). Sheet acrylic dimensions must be stored and cut area + waste/kerf recorded; remnant reusable stock tracked separately if practical. Do not equate purchase cash outflow with COGS.
3. **Order costing**: consume inventory against the canonical order ID and item lines. Keep material actual usage, outsourced work, packaging, shipping, variable labour separately; never deduct material cost twice. Manual cost adjustment must include reason and actor. Unknown cost stays 'not entered', not RM0. Quote cost is an estimate, order cost is actual. Cancellations reverse reserved/consumed material only through explicit approved stock return/write-off.
4. **Operating expenses**: rent, utilities, ads, subscriptions, repairs, payment gateway fees, business transport, etc.; distinguish personal/non-deductible, shared-use and tax-deductible review status. Payments, supplier bills and expenses are separate concepts; avoid counting a supplier payment as a second expense.
5. **Fixed assets**: machine, printer, CNC, computer; asset register with purchase cost, date in use, business-use share, disposal, supporting receipt, accounting depreciation and separate capital-allowance worksheet for tax. Never automatically expense capital purchases or treat accounting depreciation as tax deduction.
6. **Owner transactions**: capital introduced, personal withdrawal and owner-paid business purchase are equity/funding, not sales, payroll or tax-deductible expenses. Business cash position must be separate from profit.
7. **Reports**: revenue (accrual basis with consistent recognition policy) minus COGS = gross profit; minus operating expenses and accounting depreciation = accounting profit; tax adjustment produces estimated adjusted/statutory income. Show cash in/out separately. Opening inventory + purchases - closing inventory = COGS cross-check, with write-offs and adjustments separately explained. Monthly and annual periods, year-end inventory count and locked periods, downloadable CSV.
8. **Tax (Malaysia sole proprietor)**: Form B preparation worksheet, not automatic filing. Collect business adjusted income, capital allowances, brought-forward losses where applicable, other individual income (including employment), tax residence, personal reliefs/rebates, PCB/CP500 paid, charitable deductions, tax year-specific progressive rate table. Tax estimator is **incomplete** until all required inputs entered. Never display a flat 'tax on business profit' as final individual liability. Keep tax rate table versioned by year and source URL, and show last verified date. Income tax and e-Invoice are distinct obligations. Display e-Invoice applicability as 'check eligibility' based on annual turnover and current HASiL guideline, not unconditional exemption.

## Proposed schema (additive only, migration reviewed before use)
- purchase_headers(id, supplier_id, invoice_no, date, status, total_minor, attachment_id, funding_type, created_by, revision)
- purchase_lines(id, purchase_id, item_id, category, qty_decimal, unit, amount_minor, allocated_freight_minor)
- inventory_items(id, sku, name, type, base_unit, dimensions, costing_method, reorder_level, active)
- inventory_movements(id, item_id, qty_decimal_signed, value_minor_signed, movement_type, purchase_line_id, order_id, timestamp, actor, reversal_of)
- expense_entries(id, date, category, amount_minor, purchase_line_id, supplier_id, deductible_review, business_use_pct, attachment_id)
- asset_register(id, purchase_line_id, cost_minor, in_service_date, business_use_pct, depreciation_policy, status)
- order_cost_allocations(id, order_id, source_movement_id, expense_entry_id, amount_minor, type, created_by)
- owner_equity_entries(id, date, amount_minor, kind, note)
- tax_year_settings(year, jurisdiction, residency, source_url, reviewed_at, status)
- tax_adjustments(id, year, type, amount_minor, rationale, attachment_id)
- audit_log reuse existing pattern; attachments use existing storage security pattern.

All monetary values integer sen, no floating point; stock quantities decimal with fixed precision. D1 transaction boundaries, optimistic revisions, idempotency keys for posting and reversal. Permission model: owner financial/tax full; sales cost visibility configurable; production stock consumption limited; no tax/personal data for staff. Never expose receipts, TIN, salary or tax details through public shop endpoints. Back up/export before schema migration.

## Screen design
- Finance overview: Cash collected / Outstanding / Sales / COGS / Gross profit / Operating expenses / Accounting net profit / Inventory value / Tax provision. Label estimates and missing-cost coverage.
- Purchase form: supplier, date, receipt, repeatable item lines; choose Stock / Expense / Asset; single Confirm purchase button; auto-generated ID.
- Stock: searchable material cards, quantity, average cost, low-stock alert; quick Add purchase / Use for order / Adjust with reason.
- Order detail: separate payment status and work status; expandable Cost & margin section, itemized actual material movements.
- Tax: select year; income, tax adjustments, other income, reliefs, payments, estimated balance; downloadable supporting report; clear 'not tax advice/not submitted' status.

## Acceptance tests
- Buying 100 sheets at RM200 each and using 20: 80 remain stock; COGS includes 20 only, before adjustments.
- Partial supplier payment does not create double expense; owner-funded purchase not double income.
- Same order materials cannot be consumed twice on retry.
- Quote -> order -> deposit receipt -> production -> handoff -> final receipt unchanged.
- Refund, void, damaged stock, returned stock, supplier credit note and machine asset disposal produce reversible audit trails.
- Profit and cash flow remain different on unpaid invoices; tax estimate not 'final' with missing salary/reliefs.
- BM and EN each consistent, accessible mobile at 375px width, no regression to existing features.

## Authoritative references (verify again at implementation)
- https://www.hasil.gov.my/individu/kadar-cukai/ (individual resident YA 2023–2025 published table; don't assume YA 2026 identical)
- https://www.hasil.gov.my/en/e-invois/pelaksanaan-e-invois-di-malaysia/garis-masa-pelaksanaan-e-invois/ (updated 30 Aug 2026; turnover under RM3m stated exempt, subject to current guidelines)
- https://www.hasil.gov.my/e-invois/rujukan-pelaksanaan-e-invois/ (guidelines)
- https://www.hasil.gov.my/individu/soalan-lazim-individu/ (taxpayer reporting duties)
