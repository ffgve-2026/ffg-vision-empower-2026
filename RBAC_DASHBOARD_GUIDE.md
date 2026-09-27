# RBAC Dashboard Branch Guide

Onboarding doc for anyone pulling `feature/complete-frontend` (the RBAC dashboard shell, `feature/rbac-dashboard`, already landed in `main` via PR #5 — this branch builds out every remaining screen on top of it). Three parts: how roles/DocTypes work, how to get running locally, and how to test as each role.

---

## 1. How roles & DocTypes are implemented here

**There are no new custom DocTypes in this app yet.** If you're looking for a `Vendor` or `Purchase Requisition` DocType, they don't exist here — Master Data, the PR workflow, Inventory, Dispatch, and Reports are all UI pages backed by local mock data (or, for the Dashboard and PR steps 1-2, real role-checked API endpoints returning mock data) rather than a real data model. This was a deliberate split: frontend builds every screen against a stable mock/contract now; a separate teammate wires real DocTypes/APIs in underneath later without needing to touch these components — see `API_INTEGRATION_GUIDE.md` in this same repo root for the full page-by-page map of what's mock today and how to swap it for real endpoints. Real DocTypes for Master Data already exist on two *other*, not-yet-merged branches/PRs (`feature/master-data`, `feature/custom-api`).

### Roles

Four real roles, defined as fixtures so `bench migrate` installs them on every machine:

- `vision_empower/fixtures/role.json` — the actual Role records: `Vision Empower Field User`, `Vision Empower Senior Manager`, `Vision Empower Admin`, `Vision Empower Finance`, plus `Vision Empower User` (a pre-existing role that was defined ad-hoc in someone's local Desk before this work and never exported — fixed here by fixturing it properly rather than deleting it, since `Test Item`'s permissions table already references it).
- `vision_empower/hooks.py` — declares these in the `fixtures` list so they sync automatically.

No manual role creation needed — `bench migrate` handles it.

### The RBAC pattern (used everywhere, follow it for new work)

Two layers, always both present:

1. **Client-side** (`public/js/vision_empower/config/roles.js`, `config/dashboardWidgets.js`) — decides what the UI *shows*: nav visibility, which dashboard widgets render, and (via each PR step page's `canAct`/`canSubmit`/`canDecide` check) whether action buttons/forms are shown at all. This is pure UX convenience.
2. **Server-side** (`vision_empower/vision_empower/api.py`) — the Dashboard/PR-step-1/PR-step-2 endpoints call `frappe.only_for([...roles, "System Manager"])` before doing anything, and the Dashboard endpoint additionally filters *which data sections* it returns based on the caller's role. **This is the real security boundary** — client-side checks never are. PR steps 3-8 don't have real backend wiring yet (see above), so for those steps only the client-side layer currently exists — that's a known gap for whoever wires the real API.

If you're adding a new page/action, mirror this: hide it client-side for UX, but always re-check the role in the backend method independently once real endpoints exist.

### Where things live

| What | Where |
|---|---|
| Sidebar/route config, role constants, PR-step→role mapping | `public/js/vision_empower/config/roles.js` |
| Dashboard widget-visibility-per-role | `public/js/vision_empower/config/dashboardWidgets.js` |
| Master Data mock data | `public/js/vision_empower/config/masterDataMock.js` |
| Backend endpoints + role checks (Dashboard, PR steps 1-2) | `vision_empower/vision_empower/api.py` |
| Routes | `public/js/vision_empower/router/index.js` |
| Reusable bordered-widget component | `components/BaseWidget.vue`, `components/KpiWidget.vue` |
| Toast/notification system | `components/toast/` |
| PR workflow (all 8 steps + status/audit-trail page) | `views/RequisitionInitiation.vue`, `views/Approval.vue`, `views/VendorQuotations.vue`, `views/VendorSelection.vue`, `views/PaymentApproval.vue`, `views/PaymentRecord.vue`, `views/DispatchInitiation.vue`, `views/DeliveryConfirmation.vue`, `views/PurchaseRequisitionDetail.vue`, `views/PurchaseRequisitionList.vue` |
| Master Data (list + detail) | `views/VendorList.vue`/`VendorDetail.vue`, `SchoolList.vue`/`SchoolDetail.vue`, `ItemList.vue`/`ItemDetail.vue`, `KitList.vue`/`KitDetail.vue` |
| Inventory, Dispatch & Logistics | `views/LocationTransfer.vue`, `views/DeliveryDiscrepancyLog.vue` |
| Reports | `views/ProcurementSummaryReport.vue`, `views/StockStatusReport.vue`, `views/DispatchStatusReport.vue` |

Every sidebar nav item now has a real page — nothing left pointing at `RolePlaceholder.vue`.

---

## 2. Getting running locally after pulling this branch

Assumes you've already got a working `frappe-bench` per the repo's main README. A few things specific to *this* branch/environment that aren't obvious from that doc:

### Prerequisites specific to this branch

- **Frappe `version-16`**, not the README's stated 17.x — that version doesn't exist yet as a real branch; `version-16` is what this bench is actually built against.
- **Python 3.14, native arm64** if you're on Apple Silicon. Building against an x86_64 Python/MariaDB combo will fail with a `mysqlclient` symbol mismatch (`dlopen ... symbol not found`) — make sure `pyenv`/Python and MariaDB are both installed via a native `/opt/homebrew` toolchain, not `/usr/local`'s Intel one.
- **Node 24.x** via `nvm`.
- **MariaDB + Redis** running (native arm64 build, per above).

### Steps

```bash
git checkout feature/complete-frontend
git pull

cd ~/<your-bench>/frappe-bench

# installs the 5 roles above + syncs everything via fixtures
bench --site <your-site> migrate

# rebuilds JS + CSS bundles
bench build --app vision_empower

bench start
```

Then open `http://<your-site>:8000/app/vision-empower`.

**Important:** after any rebuild, test in an **incognito/private window**, or hard-refresh and confirm the network tab shows a new asset hash. This bench's asset caching means a normal refresh doesn't always reliably pick up a fresh CSS/JS bundle.

### If something looks visually broken

Check `public/css/vision_empower.bundle.css` first — **this app doesn't use Tailwind utility classes** (Desk's compiled CSS is Tailwind purged against Frappe's own source, so most utility classes you'd expect aren't actually in the shipped CSS and silently do nothing). All real styling lives in that one plain-CSS file with `ve-*` class names. If you add a new class in a `.vue` template, it needs a matching rule there — a `.vue` file's own `<style>` block never actually loads in the browser (a Frappe asset-manifest quirk), so don't rely on it.

Also: don't add `frappe-ui` component imports (`Button`, `Alert`, `Badge`, etc.) — most of them fail to build on this bench's older `esbuild-plugin-vue3`. Use `BaseWidget`/`KpiWidget` instead; they're the local replacement.

---

## 3. Testing as each role

Administrator implicitly has every role in Frappe, so logging in as Administrator shows the full dashboard/nav regardless of gating — not useful for actually checking RBAC behavior. Four test users already exist on this dev site, one per role:

| Login | Password | Role |
|---|---|---|
| `field.user@visionempower.test` | `Test@1234` | Vision Empower Field User |
| `senior.manager@visionempower.test` | `Test@1234` | Vision Empower Senior Manager |
| `admin.user@visionempower.test` | `Test@1234` | Vision Empower Admin |
| `finance.user@visionempower.test` | `Test@1234` | Vision Empower Finance |

These are local-only test accounts on this dev site — not real credentials, not something to reuse in staging/production. Log in as any of them at `http://<your-site>:8000/app/vision-empower` to see that role's actual dashboard widgets, nav, and which PR-step actions are enabled vs. view-only.

**Note:** these users only exist on the site they were created on (they're not fixtures) — if you're on a different site/bench, you won't have them automatically. To add your own:

**Via Desk (one at a time):**
1. Desk → **User List** → New User → enter an email, save
2. Open that user → **Roles** tab → check the relevant `Vision Empower *` role → Save
3. Set a password: User → **Set New Password**, or use the "Reset Password" flow

**Via `bench console` (bulk/scripted):**
```python
import frappe

user = frappe.get_doc({
    "doctype": "User",
    "email": "someone@example.com",
    "first_name": "Someone",
    "send_welcome_email": 0,
    "roles": [{"role": "Vision Empower Admin"}],
})
user.insert(ignore_permissions=True)
frappe.utils.password.update_password("someone@example.com", "some-password")
frappe.db.commit()
```
