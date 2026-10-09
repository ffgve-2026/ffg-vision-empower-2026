# API Integration Guide

How the Vision Empower frontend is wired to the backend. Every screen reads and
writes real DocTypes — there is no mock data left in the frontend or in
`api.py`. See `RBAC_DASHBOARD_GUIDE.md` for environment setup, roles and test
users.

---

## 1. Where things live

| Layer | File |
|---|---|
| PR workflow, Dashboard, Reports, Vendor Prices, Location Transfer, CSV import | `vision_empower/vision_empower/api.py` |
| Master Data CRUD (Vendor/School/Item/Kit) | `vision_empower/api/{vendor,school,item,kit}.py` + `frappe.client.*` from the views |
| Delivery Discrepancy | `vision_empower/api/delivery_discrepancy.py` |
| Frontend API helpers | `public/js/vision_empower/utils/api.js` (`callApi`, `uploadFile`, `getList`, `formatInr`, `formatDate`) |

`callApi("method_name", args)` calls `vision_empower.vision_empower.api.<method_name>`.

---

## 2. RBAC — two layers, always both

1. **Client-side** (`config/roles.js` `PR_STEP_ROLES`, each page's `canAct` /
   `canManage`) only hides forms and buttons. Not security.
2. **Server-side** — every whitelisted method calls
   `frappe.only_for([...roles, "System Manager"])` first. Stage endpoints also
   refuse to run unless the PR is at their stage (`_require_stage`).

Writes from stage endpoints use `ignore_permissions` *after* the role check,
because the acting role (e.g. Finance) usually has no write permission on the
PR itself. All four roles have **read** permission on every procurement
DocType, which is what lets them open private attachments.

---

## 3. The 8-step Purchase Requisition workflow

Each step writes to the DocType that owns that stage. The PR's
`workflow_stage` field says which step is waiting; its `activity` table
(`PR Activity`) is the audit trail every step appends to.

| # | Step (page) | Role | Endpoint | Writes |
|---|---|---|---|---|
| 1 | Requisition (`RequisitionInitiation.vue`) | Field User | `submit_purchase_requisition` | **Procurement Requisition** + PR Line Items (a Kit is expanded into its items × qty) + PR Target Schools |
| 2 | Approval (`Approval.vue`) | Senior Manager | `decide_purchase_requisition` | PR approved/rejected |
| 3 | Quotations (`VendorQuotations.vue`) | Admin | `add_vendor_quotation` (repeatable), `close_quotation_collection` | **Vendor Quotation** |
| 4 | Vendor Selection (`VendorSelection.vue`) | Admin | `select_vendor` | **VE Purchase Order** + PO Line Items; quotes marked Selected / Not Selected |
| 5 | Payment Approval (`PaymentApproval.vue`) | Finance | `decide_payment_approval` | approve → **Vendor Invoice** (+ file). Request revision → PO cancelled, PR back to Vendor Selection |
| 6 | Payment (`PaymentRecord.vue`) | Finance | `record_payment` | **Payment** |
| 7 | Dispatch (`DispatchInitiation.vue`) | Admin | `confirm_dispatch` | one **Delivery Challan** per target school (qty split evenly) |
| 8 | Delivery (`DeliveryConfirmation.vue`) | Field User | `confirm_delivery` | **Good Receipt Notes** + GRN Line Items; challans → Delivered; PR closed |

`workflow_stage` values and the stage ids the frontend uses:
`Pending Approval` (approval) → `Quotation Collection` (quotations) →
`Vendor Selection` (vendor-selection) → `Payment Approval Pending`
(payment-approval) → `Payment Processing` (payment) → `Dispatch Pending`
(dispatch) → `Delivery Pending` (delivery) → `Completed`; `Rejected` from
Approval.

**Read endpoints:** `list_purchase_requisitions` (PR List, Dashboard),
`get_purchase_requisition_status` (every step page + the audit trail —
returns the PR, its quotations, PO, invoice, payment, challans, GRN and the
activity trail), `list_vendor_quotations`, `add_pr_attachment` (attach a file
to any reached step from the audit trail page).

**PR creation has exactly one path:** `submit_purchase_requisition`. The old
`api/procurement.save_procurement_requisition` was removed because it created
PRs outside the workflow (no stage, no audit trail). The read-only helpers in
`api/procurement.py` are unused by the frontend.

### File uploads

The browser uploads to Frappe's `/api/method/upload_file` (private,
unattached) via `uploadFile()`, then passes the returned `file_url` to the
stage endpoint, which attaches the File to the PR (and the stage's own record)
after its role check — see `_attach_file` in `api.py`.

---

## 4. Vendor Prices

`Master Data → Vendor Prices` (`VendorItemPriceList.vue`) manages **Vendor
Item Price** rows (`list_vendor_item_prices`, `save_vendor_item_price`,
`delete_vendor_item_price`; Admin writes, everyone reads). The latest
effective price per item feeds the PR's estimated value (step 1/2) and the PO
line unit prices (step 4), and shows on Vendor Detail.

---

## 5. Dashboard and Reports

All computed from the DocTypes above — no hardcoded numbers.

- `get_dashboard_kpis` — only computes the KPIs/sections the caller's role may
  see (`DASHBOARD_LAYOUT_BY_ROLE`).
- `get_procurement_summary_report(date_range, vendor, funder)` — POs, spend,
  paid vs pending (Payments), lead time PR → first dispatch.
- `get_stock_status_report(category)` — see stock note below.
- `get_dispatch_status_report(state, time_range)` — one row per Delivery
  Challan.
- `list_school_dispatches(school)` — School Detail's dispatch history.

Cancelled POs (from a revision) are excluded from spend and stock.

**Stock is derived, not a ledger:**
`in hand = Item.opening_stock + PO qty on paid PRs − Delivery Challan qty`.
`reorder_level` and `opening_stock` are fields on Item. There is no
per-warehouse stock; Location Transfers are recorded (In Transit → Completed
via `complete_location_transfer`) but don't move stock.

---

## 6. CSV import

`bulk_import_csv(doctype)` + `get_import_template(doctype)`, surfaced as
**Template** / **Import CSV** buttons on the Vendor, School, Item, Kit and
Vendor Prices lists (`components/ImportCsvButton.vue`, Admin only).

- Only master-data DocTypes are accepted (`IMPORTABLE_DOCTYPES`).
- Headers may be fieldnames or labels.
- Link cells may hold the record ID or its name (`ABC Supplies`).
- Check cells accept 1/0, yes/no, true/false.
- Child tables use `Value:qty; Value:qty` — e.g. a Kit's `Kit Items` column:
  `Braille Slate:2; Stylus:2`.
- Each row is all-or-nothing; good rows are kept when others fail.

---

## 7. Still static

| What | Where |
|---|---|
| Bank accounts list on Payment Record | `views/PaymentRecord.vue` (`bankAccounts`) — no Bank Account DocType |
| Even split of quantity across target schools at dispatch | `confirm_dispatch` in `api.py` |
| Per-role dashboard layout (inferred, not specified) | `DASHBOARD_LAYOUT_BY_ROLE` in `api.py` + `config/dashboardWidgets.js` |
| Payment modes list | `views/PaymentRecord.vue` (`paymentModes`) |
