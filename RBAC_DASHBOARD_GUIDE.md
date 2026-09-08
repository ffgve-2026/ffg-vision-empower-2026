# RBAC Dashboard Branch Guide

Onboarding doc for anyone pulling `feature/rbac-dashboard`. Two parts: how roles/DocTypes work in this PR, and how to get running locally.

---

## 1. How roles & DocTypes are implemented here

**There are no new custom DocTypes in this PR yet.** If you're looking for a `Vendor` or `Purchase Requisition` DocType, it doesn't exist — Master Data and the PR workflow are backed by real, role-checked API endpoints returning hardcoded mock data for now (see `vision_empower/vision_empower/api.py`). This was a deliberate call: build a real Dashboard + the start of the PR workflow against a stable, real API surface before investing in the full data model. See the API contract doc (ask in the team channel for the link) for the full spec of every DocType/endpoint still to come.

### Roles

Four real roles, defined as fixtures so `bench migrate` installs them on every machine:

- `vision_empower/fixtures/role.json` — the actual Role records: `Vision Empower Field User`, `Vision Empower Senior Manager`, `Vision Empower Admin`, `Vision Empower Finance`, plus `Vision Empower User` (a pre-existing role that was defined ad-hoc in someone's local Desk before this PR and never exported — fixed here by fixturing it properly rather than deleting it, since `Test Item`'s permissions table already references it).
- `vision_empower/hooks.py` — declares these in the `fixtures` list so they sync automatically.

No manual role creation needed — `bench migrate` handles it.

### The RBAC pattern (used everywhere, follow it for new work)

Two layers, always both present:

1. **Client-side** (`public/js/vision_empower/config/roles.js`, `config/dashboardWidgets.js`) — decides what the UI *shows*: nav visibility, action buttons, which dashboard widgets render. This is pure UX convenience.
2. **Server-side** (`vision_empower/vision_empower/api.py`) — every whitelisted method calls `frappe.only_for([...roles, "System Manager"])` before doing anything, and the Dashboard endpoint additionally filters *which data sections* it returns based on the caller's role. **This is the real security boundary** — client-side checks never are.

If you're adding a new page/action, mirror this: hide it client-side for UX, but always re-check the role in the backend method independently.

### Where things live

| What | Where |
|---|---|
| Sidebar/route config, role constants | `public/js/vision_empower/config/roles.js` |
| Dashboard widget-visibility-per-role | `public/js/vision_empower/config/dashboardWidgets.js` |
| All backend endpoints + role checks | `vision_empower/vision_empower/api.py` |
| Routes | `public/js/vision_empower/router/index.js` |
| Reusable bordered-widget component | `components/BaseWidget.vue`, `components/KpiWidget.vue` |
| Toast/notification system | `components/toast/` |
| Real pages built so far | `views/Dashboard.vue`, `views/RequisitionInitiation.vue` (PR step 1), `views/Approval.vue` (PR step 2) |
| Everything else | `views/RolePlaceholder.vue` — a stub, not yet built |

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
git checkout feature/rbac-dashboard
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

### Testing as a non-Administrator role

Administrator implicitly has every role, so you'll see the full dashboard/nav by default. To see role-scoped behavior for real:

1. Desk → **User List** → create a test user (or use an existing one)
2. Open that user → **Roles** tab → add one of the 4 `Vision Empower *` roles
3. Log in as that user (or use `bench --site <site> browse --user <email>` / impersonate via Desk) to see the Dashboard/nav filtered to just that role

### If something looks visually broken

Check `public/css/vision_empower.bundle.css` first — **this app doesn't use Tailwind utility classes** (Desk's compiled CSS is Tailwind purged against Frappe's own source, so most utility classes you'd expect aren't actually in the shipped CSS and silently do nothing). All real styling lives in that one plain-CSS file with `ve-*` class names. If you add a new class in a `.vue` template, it needs a matching rule there — a `.vue` file's own `<style>` block never actually loads in the browser (a Frappe asset-manifest quirk), so don't rely on it.

Also: don't add `frappe-ui` component imports (`Button`, `Alert`, `Badge`, etc.) — most of them fail to build on this bench's older `esbuild-plugin-vue3`. Use `BaseWidget`/`KpiWidget` instead; they're the local replacement.
