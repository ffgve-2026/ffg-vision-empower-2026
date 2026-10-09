# Vision Empower — User Guide

How to use Vision Empower's procurement system, for everyone who works in it:
what each role sees, what each role does, and how a purchase request moves
from "we need this" to "the school has signed for it".

> **PDF version:** [Vision-Empower-User-Guide.pdf](Vision-Empower-User-Guide.pdf) — same content, for printing or sharing.
>
> Screenshots use demo data (people such as *Riya Sen* and *Arun Iyer*, and
> schools in Bihar and Jharkhand). Your own screens show your organisation's data.

**Contents**

1. [Roles at a glance](#1-roles-at-a-glance)
2. [Getting in](#2-getting-in)
3. [Finding your way around](#3-finding-your-way-around)
4. [How a purchase request moves](#4-how-a-purchase-request-moves)
5. [Field User](#5-field-user)
6. [Senior Manager](#6-senior-manager)
7. [Admin](#7-admin)
8. [Finance](#8-finance)
9. [Master Data](#9-master-data)
10. [Inventory and Dispatch](#10-inventory-and-dispatch)
11. [Reports](#11-reports)
12. [Documents and uploads](#12-documents-and-uploads)
13. [Troubleshooting](#13-troubleshooting)
14. [For administrators: setting up users](#14-for-administrators-setting-up-users)

---

## 1. Roles at a glance

Everyone can **see** every page and every purchase request. What changes by role
is **what you can do** — the buttons for a step only appear for the role that
owns it — and **what your Dashboard shows**.

| Role | Usually | Owns these steps | Also manages |
|---|---|---|---|
| **Field User** | Field coordinator | 1 Raise requisition · 8 Confirm delivery | Delivery discrepancies |
| **Senior Manager** | Programme head | 2 Approve or reject | — |
| **Admin** | Procurement officer | 3 Collect quotations · 4 Select vendor · 7 Dispatch | Master Data, Vendor Prices, CSV import, Location Transfers |
| **Finance** | Finance / accounts | 5 Approve payment · 6 Record payment | — |
| **System Manager** | IT / site admin | Everything | User accounts |

---

## 2. Getting in

1. Open your Vision Empower site in a browser (Chrome, Edge, Firefox or Safari)
   and sign in with the email and password you were given.

   ![Sign-in page](images/login.png)

2. Open **Vision Empower** — either from **Pages → Vision Empower** in the left
   menu, or by going straight to `https://<your-site>/app/vision-empower`.
   Bookmark that address.

If Vision Empower isn't in your menu, or you get a permission error, your account
has no Vision Empower role yet — see [section 14](#14-for-administrators-setting-up-users).

---

## 3. Finding your way around

![Search results for "PR-2026"](images/global-search.png)

| Area | What it's for |
|---|---|
| **Sidebar** (left) | Every section: Dashboard, Master Data (Vendors, Schools, Items, Kits, Vendor Prices), Procurement, Inventory, Dispatch & Logistics, Reports. *Collapse Sidebar* at the bottom gives you more room. |
| **Breadcrumb** (top left) | Where you are, e.g. *Vision Empower / Procurement / Payment Approval*. |
| **Search** (top) | Type any **name or ID** — a vendor, school, item, kit, **PR** (`PR-2026-00192`), **purchase order** (`VE-PO-…`), **delivery challan** (`DC-…`), LR/docket number, or transfer (`TRF-…`). Click a result to open it; POs and challans open their purchase request. |
| **Your name** (top right) | Who you're signed in as. |

**Tip:** the quickest way to any purchase request is to paste its ID into search.

### The Dashboard

The Dashboard is your home page and is **different for each role** — it shows
the work waiting for *you*. Every role also gets **Procurement Requests**: every
open request with its current step. Click any request to open its status page.

| Role | Cards across the top | Lists below |
|---|---|---|
| Field User | Items below reorder · Schools dispatched | Reorder alerts (with *Create PR →*) · My Requisitions |
| Senior Manager | Total PO value this month · Items below reorder · Schools dispatched | Reorder alerts · **Pending PR Approvals** (Approve / Reject) · 6-month spend trend |
| Admin | Total PO value this month · Items below reorder | Reorder alerts · **Vendor Quotations & Selection** · 6-month spend trend |
| Finance | Total PO value this month · **Pending payments** | **Payments Queue** · 6-month spend trend |

---

## 4. How a purchase request moves

A **purchase request (PR)** goes through eight steps. Each step belongs to one
role; when it's done, the PR moves to the next step automatically.

| # | Step | Who | What they do | What it creates |
|---|---|---|---|---|
| 1 | Requisition | Field User | Asks for a Kit or an Item, a quantity, and the schools it's for | The PR |
| 2 | Approval | Senior Manager | Approves or rejects | — |
| 3 | Quotations | Admin | Records each vendor's quote (with the quote document) | Vendor Quotations |
| 4 | Vendor Selection | Admin | Picks a quote and writes why | **Purchase Order** |
| 5 | Payment Approval | Finance | Uploads the vendor's invoice and approves — or sends it back | **Vendor Invoice** |
| 6 | Payment | Finance | Records the payment (mode, date, UTR) | **Payment** |
| 7 | Dispatch | Admin | Records the shipment (transporter, LR number, insurance) | One **Delivery Challan** per school |
| 8 | Delivery | Field User | Confirms receipt with the signed challan | **Goods Receipt Note**; PR closed |

A PR can end as **Completed** (after step 8) or **Rejected** (at step 2).

### The PR status page (audit trail)

Every PR has one page that shows everything about it: the request, every
document created along the way, and an **audit trail** of who did what, when,
with their remarks and attachments. Open it by clicking any PR anywhere in the
app, or by searching for its ID.

![A completed PR's status page](images/status-page-completed.png)

- **Request Summary** — who asked, for what, for which schools, and the current step.
- **Documents** — the purchase order, invoice, payment, delivery challans, goods
  receipt, and any delivery discrepancies, as they're created.
- **Audit Trail** — the 8 steps: ✓ done, highlighted *In Progress*, or *Not reached
  yet*. Each entry shows the person, the action, the time and their remarks; files
  uploaded at that step are listed under it — click one to open it.
- **+ Attach Document** — anyone can add a supporting file to any step the PR has reached.
- **Action** — if the PR is waiting on *your* role you'll see **Go to <step> →**;
  otherwise it tells you which step it's waiting on.

![A PR waiting on another role](images/status-page-waiting.png)

The **Procurement** page in the sidebar lists every PR with its step:

![Procurement list](images/procurement-list.png)

### "This step is view-only for you"

You can open any step's page, but only the owning role can act on it. Everyone
else sees the details with a note instead of buttons:

![A step another role owns](images/view-only-step.png)

Likewise, if a PR isn't at that step yet (or has moved past it), the page says
so — e.g. *"Dispatch isn't pending — this request is at Payment Processing."*

---

## 5. Field User

You raise requests for what schools need, confirm when deliveries arrive, and
report anything short or damaged.

![Field User dashboard](images/dashboard-field-user.png)

**Your Dashboard** shows items that have fallen below their reorder level (with a
*Create PR →* shortcut), how many schools have been reached, and **My
Requisitions** — your requests and where each one is.

### Raise a purchase request (step 1)

**Dashboard → Create PR**, or **Procurement → New Requisition**.

![New requisition](images/step-1-requisition.png)

1. Choose **either** a **Kit** **or** a single **Item** (picking one clears the other).
2. Enter the **Quantity** — number of kits, or number of units for an item.
3. Pick the **Expected Delivery** date, and optionally the **Fund**.
4. Tick every **Target School**. The quantity is split evenly across the schools
   when it's dispatched.
5. Add **Remarks** if there's context the approver should know.
6. **Submit for Approval.** You land on the new PR's status page; it now waits for
   a Senior Manager.

The form tells you if something is missing — e.g. *"Select at least one target school."*

### Confirm a delivery (step 8)

When a PR reaches **Delivery Confirmation**, open it (from *My Requisitions* or
search) and click **Go to Delivery Confirmation →**.

![Delivery confirmation](images/step-8-delivery.png)

1. Enter the **Received Date** and who **Received By** (e.g. the headmistress).
2. Choose the **Condition** — Good, Damaged or Shortage.
3. Upload the **signed delivery challan** (required) — drag it in or click
   *Choose File*.
4. **Confirm Receipt and Close PR.** The PR is marked **Completed**.

### Report a delivery discrepancy

If a school received less than was sent — see [section 10](#report-a-delivery-discrepancy-field-user).

---

## 6. Senior Manager

You decide which requests go ahead.

![Senior Manager dashboard](images/dashboard-senior-manager.png)

**Your Dashboard** shows this month's purchase-order value, stock alerts,
dispatch coverage, the 6-month spend trend, and **Pending PR Approvals** — each
with **Approve** and **Reject** buttons.

### Approve or reject (step 2)

Click **Approve** or **Reject** on the Dashboard (both open the approval page, so
you see the details before deciding), or open the PR and click **Go to Approval →**.

![Approval page](images/step-2-approval.png)

The page shows what's being asked for, for which schools, by when, and the
**estimated value** (quantity × the latest vendor price for each item).

1. Add **Remarks** (optional, but they appear on the audit trail for everyone).
2. **Approve** — the PR moves to Quotation Collection for Admin — or
   **Reject** — the PR is closed as Rejected and the trail shows ✕ at Approval.

---

## 7. Admin

You find vendors and prices, choose who supplies each request, dispatch goods,
and keep Master Data up to date.

![Admin dashboard](images/dashboard-admin.png)

**Your Dashboard** shows purchase-order value, stock alerts, the spend trend, and
**Vendor Quotations & Selection** — PRs waiting for quotes or for a vendor choice,
with how many quotes each has.

### Collect quotations (step 3)

Open the PR and click **Go to Quotation Collection →**.

![Vendor quotations](images/step-3-quotations.png)

1. For each quote received, fill in **Add Quotation**: the **Vendor**, **Total
   Amount**, and optionally the quotation reference, date, delivery days, validity
   and the **quotation document**. Click **Add Quotation**. Repeat for every vendor.
2. All quotes appear in **Quotation Comparison**, cheapest first. Click the one you
   want, then **Proceed with Vendor**.

### Select the vendor (step 4)

![Vendor selection](images/step-4-vendor-selection.png)

Check the vendor, amount and order summary, write a **Justification** (required —
e.g. *"Lowest quote with the shortest delivery time"*), and **Confirm Vendor
Selection**. A **purchase order** is raised and the PR goes to Finance.

### Dispatch (step 7)

Once Finance has paid, the PR shows **Go to Dispatch →**.

![Dispatch](images/step-7-dispatch.png)

The page lists the schools — **one delivery challan is raised per school**, with the
quantity split evenly. Enter the **Dispatch Date** (not before the request date),
**Transporter** and **LR / Docket Number**, optionally upload the transit
insurance certificate, and click **Initiate Dispatch**. The PR waits for the Field
User to confirm delivery.

Admins also manage **Master Data** ([section 9](#9-master-data)) and **Location
Transfers** ([section 10](#10-inventory-and-dispatch)).

---

## 8. Finance

You check invoices against purchase orders and release payments.

![Finance dashboard](images/dashboard-finance.png)

**Your Dashboard** shows this month's purchase-order value, **Pending payments**
(the total on PRs waiting for payment approval or payment), the **Payments Queue**,
and the spend trend.

### Approve the payment (step 5)

Open the PR and click **Go to Payment Approval →**.

![Payment approval](images/step-5-payment-approval.png)

1. Check the **vendor**, **purchase order** and **PO amount**.
2. Enter the **Invoice Number**, **Invoice Date**, **Invoice Amount** (pre-filled
   with the PO amount) and GST if any.
3. Upload the **vendor invoice** (PDF, JPG or PNG — required to approve).
4. **Approve Payment.** The invoice is recorded as *Matched* if it equals the PO
   amount, otherwise *Discrepancy*.

**Something wrong with the quote or invoice?** Write what needs fixing in
**Remarks** and click **Request Revision**. The purchase order is cancelled and the
PR goes **back to Vendor Selection** for Admin to re-select or add a revised quote.

### Record the payment (step 6)

![Record payment](images/step-6-payment.png)

Confirm the **Amount**, choose the **Payment Mode** (NEFT, RTGS, …), the **Payment
Date**, the **UTR Number** and the **Bank Account** paid from, then **Record
Payment**. The PR goes to Admin for dispatch.

---

## 9. Master Data

The reference lists everything else uses. **Everyone can view them; only Admin
can add, edit or remove.**

| List | Holds | Used by |
|---|---|---|
| **Vendors** | Suppliers, contacts, GST/PAN, bank details | Quotations, purchase orders, Procurement Summary |
| **Schools** | Schools, state/district, type (Govt/Private), student counts | Requisition target schools, dispatch, Dispatch Status |
| **Items** | Each thing you buy: category, unit, reorder level, opening stock | Requisitions, kits, stock |
| **Kits** | A named bundle of items with quantities | Requisitions (a kit becomes its items × quantity) |
| **Vendor Prices** | Each vendor's unit price per item, by date | PR estimated value and purchase-order prices |

![Vendors](images/master-vendors.png)

Click any row to open its page; Admins see **Edit Details** and a remove/deactivate
button there. The vendor page also lists that vendor's current item prices:

![A vendor's page](images/master-vendor-detail.png)

![Schools — filter by state and type](images/master-schools.png)

![Items](images/master-items.png)

![Kits](images/master-kits.png)

A kit's page shows its items and quantities; **Edit Details** changes the kit's
details without touching its items.

![A kit's page](images/master-kit-detail.png)

### Vendor Prices

![Vendor prices](images/master-vendor-prices.png)

Add a price with **Vendor**, **Item**, **Unit Price**, optional **GST %** and the
**Effective Date**. The **latest** effective price is what requests and purchase
orders use. Use **Edit** / **Delete** on a row to change it.

### Importing from a spreadsheet (CSV)

Each Master Data list has **Template** and **Import CSV** (Admin only).

1. Click **Template** to download a blank CSV with the right column headings.
2. Fill it in (Excel or Google Sheets → *Save as CSV*). Rules:
   - Columns can use the heading names (*Item Name*) or field names (*item_name*).
   - Links can use the **name** instead of the ID — e.g. *Apex Educational Supplies*
     in a Vendor column.
   - Yes/no columns accept *1/0*, *yes/no* or *true/false*.
   - A kit's items go in one cell as `Item name:quantity; Item name:quantity` — e.g.
     `Braille Slate & Stylus:1; Braille Paper Ream:2`.
3. Click **Import CSV** and choose the file. You'll see how many rows were
   imported; any row with a problem is skipped and the first error is shown (all of
   them are in the browser console). Unrecognised columns are listed and ignored.

Imported records behave exactly like ones added by hand — e.g. an imported item's
opening stock shows on Stock Status, and imported prices feed requisition estimates.

---

## 10. Inventory and Dispatch

### Location transfers (Admin)

**Inventory** records stock moving between warehouses.

![Location transfers](images/inventory-transfers.png)

Choose the **Item**, **Quantity**, **From** and **To** warehouses (they must differ)
and a **Reason**, then **Submit Transfer**. It shows as *In Transit*; when it
arrives, open it and click **Mark Received** to set it to *Completed*.

### Delivery discrepancy log

**Dispatch & Logistics** lists every reported shortage. Everyone can view it;
click a DC number to open the PR it belongs to.

![Discrepancy log](images/dispatch-discrepancy-log.png)

### Report a delivery discrepancy (Field User)

![Reporting a discrepancy](images/dispatch-report-discrepancy.png)

1. Click **Report New Discrepancy**.
2. Choose the **Delivery Challan** — the **School** fills in by itself.
3. Choose the **Item** — the **Expected Quantity** (what that challan carried) fills in.
4. Enter the **Received Quantity** (it can't be more than expected) and the
   **Action Taken** (e.g. *Vendor notified*), then **Submit**.

The shortage appears in the log and on the PR's status page.

---

## 11. Reports

Under **Reports** in the sidebar; all roles can view them.

### Procurement Summary

Purchase orders, total spend, what's still unpaid, and average lead time (request →
dispatch), plus spend by vendor. Filter by period, vendor or funder; **Export CSV**
downloads the vendor ledger.

![Procurement summary](images/report-procurement-summary.png)

### Stock Status

Every item's stock: **In hand = opening stock + quantities on paid purchase orders −
quantities dispatched**, against its reorder level. Filter by category; click an
item ID to open it; **Export PDF** opens your browser's print dialog (choose *Save as PDF*).

![Stock status](images/report-stock-status.png)

### Dispatch Status

Every delivery challan by school: how much was sent, and whether it's delivered or
still in transit. Filter by state and period; **Download Report** exports a CSV;
click a DC number to open its PR.

![Dispatch status](images/report-dispatch-status.png)

---

## 12. Documents and uploads

- Steps 3, 5, 7 and 8 take a file: the quotation, the vendor invoice, the transit
  insurance certificate and the signed delivery challan. Accepted: **PDF, JPG or
  PNG**, up to 10 MB.
- Chose the wrong file? Click **Remove** next to it before submitting.
- Every file is listed on the PR's audit trail under the step it was uploaded at —
  click to open it.
- Files are private to Vision Empower users: anyone with a Vision Empower role can
  open them; nobody outside can.
- Need to add something later (a photo, a note)? Use **+ Attach Document** on the
  PR's status page.

---

## 13. Troubleshooting

| You see | What it means / what to do |
|---|---|
| *"Your role doesn't … — this step is view-only for you"* | That step belongs to another role (see [section 1](#1-roles-at-a-glance)). You can still read it. |
| *"… isn't pending — this request is at <step>"* | The PR is at a different step. Open its status page to see where it is and who it's waiting on. |
| **Search says "No matches found"** | Check the spelling, or try the ID instead of the name (or vice versa). Search covers vendors, schools, items, kits, PRs, purchase orders, challans and transfers. |
| **Search says "Search failed — try again"** | A temporary connection problem; try again. |
| **A page looks out of date or a button is missing after an update** | Your browser is showing an old copy — press **Cmd + Shift + R** (Mac) or **Ctrl + Shift + R** (Windows), or open a private window. |
| **"Permission Error" pop-up** | Your account is missing a role for that page — ask your System Manager. |
| **An upload is rejected** | Use PDF, JPG or PNG under 10 MB. A PDF that's damaged or not really a PDF is rejected. |

---

## 14. For administrators: setting up users

1. In Desk, go to **User List → + Add User**, enter the person's email and name, and
   save.
2. Open the user → **Roles** section → tick exactly one of:
   **Vision Empower Field User**, **Vision Empower Senior Manager**,
   **Vision Empower Admin** or **Vision Empower Finance**. Save.
3. Send them the site address and ask them to set a password (or set one under
   **Change Password**).

A person can hold more than one role if they genuinely do more than one job —
they'll then see the buttons and Dashboard sections of each.

---

### Keeping this guide's screenshots up to date

The screenshots are generated, not taken by hand. After a UI change, from
`apps/vision_empower` with the site running:

```bash
npx playwright test -c playwright.docs.config.js
```

This loads a demo dataset (`vision_empower/tests/demo_fixtures.py`), captures every
image in `docs/user-guide/images/` (`docs/user-guide/capture/capture.spec.js`), and
removes the demo data again. It needs `allow_tests` enabled on the site — see
[`tests/e2e/README.md`](../../tests/e2e/README.md).

Then rebuild the PDF from this README and the new images:

```bash
node docs/user-guide/build-pdf.js
```
