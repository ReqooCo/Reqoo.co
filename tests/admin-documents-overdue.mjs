import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../admin/documents.html',import.meta.url),'utf8');
const overdue=fs.readFileSync(new URL('../admin/documents-overdue-v1.js',import.meta.url),'utf8');
const overdueCss=fs.readFileSync(new URL('../admin/documents-overdue-v1.css',import.meta.url),'utf8');
const unified=fs.readFileSync(new URL('../admin/documents-unified-v1.js',import.meta.url),'utf8');

assert.match(html,/documents-overdue-v1\.css\?v=1/);
assert.match(html,/documents-overdue-v1\.js\?v=2/);
assert.match(html,/documents-unified-v1\.js\?v=2/);

assert.match(overdue,/paymentSummary/);assert.match(overdue,/rq:documents-finance-ready/);assert.match(overdue,/__REQOO_DOCS_FINANCE__/);
assert.match(overdue,/listDocuments/);
assert.match(overdue,/listPayments/);
assert.match(overdue,/OUTSTANDING/);
assert.match(overdue,/OVERDUE/);
assert.match(overdue,/DUE IN 7 DAYS/);
assert.match(overdue,/data-rq-fin-filter="partial"/);
assert.match(overdue,/data-rq-fin-filter="paid"/);
assert.match(overdue,/rqInvoiceOverdue/);
assert.match(overdue,/rqDocDrawerDue/);
assert.match(overdue,/WhatsApp Reminder/);
assert.match(overdue,/wa\.me/);
assert.match(overdue,/Baki semasa/);

assert.match(unified,/rqFinanceMatch/);
assert.match(unified,/rq:documents-finance-filter/);
assert.match(overdueCss,/rqDocsFinanceStats/);
assert.match(overdueCss,/rqFinanceFilters/);
assert.match(overdueCss,/rqReminderBtn/);

console.log('PASS: Documents outstanding, overdue, due-soon filters and WhatsApp reminders are wired.');
