# API Integration Guide

For whoever wires the real backend into this frontend (`feature/complete-frontend`).
The frontend is functionally complete — every screen in the spec exists, is
RBAC-gated, and works end-to-end against **local mock data**. Nothing here
requires frontend rework to integrate; it requires replacing mock arrays with
`frappe.call()` responses of the same shape, in the specific files listed
below.

See `RBAC_DASHBOARD_GUIDE.md` first for environment setup, roles/fixtures, and
test users. This doc is only about the mock-to-real swap.

---

## 1. What this frontend covers

Every sidebar module has a real page (nothing points at `RolePlaceholder.vue`
anymore):

| Module | Pages |
|---|---|
| **Dashboard** | Per-role KPIs + widgets (`views/Dashboard.vue`) |
| **Master Data** | Vendors, Schools, Items, Kits — List + Detail + **Create** for all four (`views/{Vendor,School,Item,Kit}{List,Detail,Create}.vue`) |
| **Procurement** | Full 8-step PR workflow + a list page + a universal audit-trail/status page (`views/PurchaseRequisitionList.vue`, `views/PurchaseRequisitionDetail.vue`, and the 8 step pages below) |
| **Inventory** | Location Transfer (`views/LocationTransfer.vue`) |
| **Dispatch & Logistics** | Delivery Discrepancy Log (`views/DeliveryDiscrepancyLog.vue`) |
| **Reports** | Procurement Summary, Stock Status, Dispatch Status (`views/*Report.vue`) |

The 8 PR workflow steps, and which role acts on each (`config/roles.js`'s
`PR_STEP_ROLES`):

| # | Step | Page | Acting role |
|---|---|---|---|
| 1 | Requisition | `RequisitionInitiation.vue` | Field User |
| 2 | Approval | `Approval.vue` | Senior Manager |
| 3 | Quotation Collection | `VendorQuotations.vue` | Admin |
| 4 | Vendor Selection | `VendorSelection.vue` | Admin |
| 5 | Payment Approval | `PaymentApproval.vue` | Finance |
| 6 | Payment Processing | `PaymentRecord.vue` | Finance |
| 7 | Dispatch | `DispatchInitiation.vue` | Admin |
| 8 | Delivery Confirmation | `DeliveryConfirmation.vue` | Field User |

Every step page is viewable by all 4 roles (read-only for whoever isn't the
acting role that step); every step page's form/action buttons are hidden via
a `canAct = userHasAnyRole(PR_STEP_ROLES.x)` check when the current user
isn't the acting role.

**Also built, not in the original step list:**
- A "Create PR" entry point on the Dashboard's universal **Procurement
  Requests** widget (Field User only) and on the Procurement list page.
- The **audit trail / status page** (`procurement-status` route) — a
  vertical timeline of all 8 stages with per-stage actor, mock comments, and
  mock attachments, reachable by clicking any PR row anywhere in the app
  (Dashboard widgets, the Procurement list). Visible to **every** role
  regardless of whose turn it is to act — see §5.
- A working **client-side CSV export** utility (`utils/csv.js`), already
  wired into three report/list "export" buttons.

---

## 2. The RBAC pattern — read before touching any endpoint

Two layers, always both present (full detail in `RBAC_DASHBOARD_GUIDE.md`):

1. **Client-side** — `config/roles.js`, `config/dashboardWidgets.js`, and each
   page's own `canAct`/`canSubmit`/`canDecide` constant. This only hides
   buttons/forms. It is **not security**.
2. **Server-side** — every whitelisted method must call
   `frappe.only_for([...roles, "System Manager"])` before doing anything, and
   any endpoint that returns different data per role (like
   `get_dashboard_kpis`) must filter its own response server-side, not rely
   on the frontend to ignore fields it didn't ask for.

**When you add a real endpoint, mirror the two existing ones in
`vision_empower/vision_empower/api.py`** (`submit_purchase_requisition`,
`decide_purchase_requisition`) — both are small, real, working examples of
this pattern already in the codebase. Don't invent a different convention.

---

## 3. Integration process (per page)

1. Open the page's `<script setup>` block. Every mock data source is a plain
   `const`/`ref` initialized from a local array or an import from
   `config/masterDataMock.js` — there's no indirection to trace through.
2. Replace the mock array with an `await frappe.call({ method: "...", args: {...} })`
   inside the page's existing lifecycle hook (`onMounted` where present) or
   submit handler.
3. Keep the response shape identical to the mock shape (field names, casing)
   — every template in this app is already written against that shape, so
   matching it means **zero template changes**. If the real DocType uses
   different field names, map them in the `.then()`/`await` callback, not in
   the template.
4. Add the matching `frappe.only_for([...])` check server-side (see §2).
5. Delete the now-unused mock import/array from that file. Leave
   `config/masterDataMock.js` itself alone until *all four* Master Data
   entities are cut over (multiple pages still import from it — see the map
   below).

---

## 4. Already real — use these as the reference pattern

| Endpoint | File | Called from |
|---|---|---|
| `get_dashboard_kpis` | `api.py` | `views/Dashboard.vue` (`onMounted`) |
| `submit_purchase_requisition` | `api.py` | `views/RequisitionInitiation.vue` (`submit()`) |
| `decide_purchase_requisition` | `api.py` | `views/Approval.vue` |

`get_dashboard_kpis` is the pattern to copy for **any** role-scoped read: it
looks up the caller's roles, unions the KPI keys/section names each role is
allowed to see (`DASHBOARD_LAYOUT_BY_ROLE` in `api.py`), and only returns
those. Administrator/System Manager bypass and see everything — useful for
your own testing.

---

## 5. Mock data map — what to replace, where

### Dashboard (`views/Dashboard.vue`)
Already calling `get_dashboard_kpis`. The endpoint's mock sections
(`_DASHBOARD_KPIS`, `_DASHBOARD_SECTIONS` in `api.py`) are what need real
queries — the frontend side needs no changes as long as the response shape
(`kpis`, `reorder_alerts`, `my_requisitions`, `pending_approvals`,
`vendor_quotations`, `payments_queue`, `spend_trend`) is preserved.

One thing to fix **when you build the real Purchase Requisition DocType**:
`_DASHBOARD_SECTIONS`'s mock `stage` values are human-readable labels
("Vendor Selection", "Pending Approval", "Payment Processing"), not the
kebab-case stage ids the audit trail page's routing expects
(`requisition`, `approval`, `quotations`, `vendor-selection`,
`payment-approval`, `payment`, `dispatch`, `delivery`). `Dashboard.vue`
currently has a `STAGE_LABEL_TO_ID` lookup papering over this mismatch for
the mock data — once a real DocType has a real stage/status field, standardize
on the kebab-case ids everywhere and delete that lookup.

The local `procurementRequests` array in `Dashboard.vue` (the universal
"Procurement Requests" widget, same data as `PurchaseRequisitionList.vue`'s
`requests` array) needs a real list endpoint — something like
`frappe.client.get_list` on the Purchase Requisition DocType, no role
filtering needed since every role can see every PR.

### Purchase Requisition workflow (steps 3–8)
Steps 1–2 are wired (see §4). Steps 3–8 have the `frappe.call` scaffold
**already sketched out but commented out** in each file — search each of
these for `// await frappe.call` and uncomment/adapt once the real methods
exist:

| Step | File | Action function |
|---|---|---|
| 3 — Quotations | `views/VendorQuotations.vue` | `selectVendor()` |
| 4 — Vendor Selection | `views/VendorSelection.vue` | `confirmSelection()` |
| 5 — Payment Approval | `views/PaymentApproval.vue` | `approvePayment()` |
| 6 — Payment Recording | `views/PaymentRecord.vue` | `recordPayment()` |
| 7 — Dispatch | `views/DispatchInitiation.vue` | (dispatch confirm handler) |
| 8 — Delivery Confirmation | `views/DeliveryConfirmation.vue` | `confirmReceipt()` |

### Purchase Requisition audit trail (`views/PurchaseRequisitionDetail.vue`)
Currently 100% mock: `STAGE_ACTORS` (who did what, per stage — should become
a real activity/history log keyed by `prId`), `STAGE_COMMENTS` (per-stage
comments), `STAGE_ATTACHMENTS` (per-stage file list). None of this persists
anywhere yet — there's no Comment or Attachment doctype wired to a Purchase
Requisition. Needs, at minimum:
- A way to fetch ordered stage history for a given `prId` (replaces
  `STAGE_ACTORS` + the done/current/pending derivation).
- A way to fetch comments per `prId`/stage (replaces `STAGE_COMMENTS`) —
  Frappe's built-in Comment doctype against a real Purchase Requisition
  DocType would cover this for free once that DocType exists.
- A way to fetch/download attachments per `prId`/stage (replaces
  `STAGE_ATTACHMENTS`) — Frappe's built-in File doctype similarly covers
  this once PRs are real documents. The `openAttachment()` click handler is
  the one spot to wire an actual download/preview — it currently just shows
  a "not wired up yet" toast.

This page is reached from every PR row across the whole app (Dashboard's 5
widgets, the Procurement list) via each page's `goToPrStatus`/`openRequest`
function — you only need to make the audit trail page itself real; every
entry point into it already works.

### Master Data — Vendors / Schools / Items / Kits
All four List + Detail + Create pages read from
`config/masterDataMock.js` (`VENDORS`, `SCHOOLS`, `ITEMS`, `KITS`, plus the
related-record maps `VENDOR_ITEMS`, `SCHOOL_DISPATCHES`,
`ITEM_VENDOR_HISTORY`, `KIT_ITEMS`). This is genuinely a stand-in for 4 real
DocTypes that don't exist in this app yet (real ones exist on the
not-yet-merged `feature/master-data` branch — check there first for the
intended schema before inventing a new one).

Per entity, once its DocType exists:
- **List page** (`{X}List.vue`) — replace the imported array with a
  `frappe.client.get_list` call in a `computed`/`onMounted`.
- **Detail page** (`{X}Detail.vue`) — replace `ARRAY.find(...)` with a
  `frappe.client.get` by the route param.
- **Create page** (`{X}Create.vue`) — replace the `ARRAY.push(...)` +
  `nextMockId()` call in `submit()` with `frappe.client.insert` (or a
  dedicated whitelisted method if creation needs side effects/validation
  beyond a plain insert). `nextMockId()` (in `masterDataMock.js`) only exists
  to fake an ID series for the mock rows — delete the call once the DocType's
  real naming series takes over.
- **Detail page's Edit/Deactivate buttons** (`editDetails()`,
  `deactivateVendor()`/`deleteSchool()`/`discontinueItem()`/`deleteKit()`) —
  still placeholder toasts, intentionally out of scope for the Create-forms
  work. Same swap pattern as Create once you get to them: gated by
  `canManage = userHasAnyRole([ROLES.ADMIN])`, already in place.

Vendor Master's **Generate CSV**/**Create DC** toolbar (in `ItemList.vue`,
selection checkboxes + `selected` ref) — CSV export is real (see §6);
**Create DC is still a placeholder** (`createDc()` in `ItemList.vue`). It's
meant to create a Delivery Challan from the selected items, but has no
target-school/PR context on that page yet — needs a small spec decision
(does it open Dispatch Initiation pre-filled? a new DC-only flow?) before
it can be wired, real backend or not.

### Inventory / Dispatch & Logistics / Reports
`LocationTransfer.vue`, `DeliveryDiscrepancyLog.vue`,
`ProcurementSummaryReport.vue`, `StockStatusReport.vue`,
`DispatchStatusReport.vue` are all local mock arrays declared directly in
each file (no shared config import) — same swap pattern as everywhere else:
replace the array with a `frappe.call`/`get_list`, keep the shape. None of
these have a whitelisted method yet; none are gated beyond the standard
nav-level `ALL_ROLES` visibility (no role restricts *viewing* these, only
Master Data's create/edit actions are Admin-gated).

`StockStatusReport.vue`'s **Export PDF** button (`exportPdf()`) is still a
placeholder — deliberately not covered by the CSV utility (a different
format, needs a PDF generation approach, wasn't requested).

---

## 6. Utilities already built for you

**`utils/csv.js`** — `toCsv(rows, columns)` / `downloadCsv(filename, rows, columns)`.
Fully working today, client-side, against mock arrays (no backend involved —
the browser builds and downloads the file itself). Already wired into:
- Item Master → **Generate CSV** (`ItemList.vue`)
- Procurement Summary Report → **Export CSV** (`ProcurementSummaryReport.vue`)
- Dispatch Status Report → **Download Report** (`DispatchStatusReport.vue`)

When you swap a page's mock array for real `frappe.call` rows, the CSV
button on that page keeps working unchanged — `downloadCsv()` just needs the
real rows array instead of the mock one, same `columns` definition either
way. Reuse this directly on any other list/report page that needs an export
button; don't write a second CSV implementation.

---

## 7. Conventions worth preserving

- **Toast pattern for "not wired up yet"**: every unimplemented action calls
  `showToast({ message: "...isn't wired up yet.", variant: "warning" })`
  (`components/toast/useToast.js`). Grep for `"isn't wired up yet"` to find
  every remaining placeholder across the app in one pass.
- **Mock ID format**: `VE-{TYPE}-NNN` (`VE-VEN-001`, `VE-SCH-004`, etc.),
  generated by `nextMockId()` in `masterDataMock.js`. Not a requirement for
  the real naming series — just what the mock rows use today.
- **`frappe.only_for([...roles, "System Manager"])`** on every whitelisted
  method, no exceptions — System Manager is the escape hatch for admin
  debugging/testing and every existing endpoint includes it.
- Keep response field casing whatever the *frontend* already expects
  (mostly `snake_case` from `api.py`, matching the rest of Frappe's own
  conventions) — don't introduce a third casing convention.
