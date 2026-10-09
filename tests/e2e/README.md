# Vision Empower — UI functional tests

Playwright tests that drive the real app in a browser as each of the four roles,
covering happy paths and failure paths:

| Spec | Covers |
|---|---|
| `pr-workflow.spec.js` | All 8 PR steps end to end across roles; form validation; rejection; payment revision loop; wrong role / wrong stage is read-only; dispatch date rules |
| `rbac.spec.js` | Every stage endpoint refuses the wrong role (403) even when called directly; out-of-order steps; a user with no role; buttons hidden per role |
| `master-data.spec.js` | Item create/edit (incl. the naming-series regression), Vendor Prices add/edit/delete, CSV import (good, bad and unknown-link rows, kit items), template download |
| `inventory-dispatch.spec.js` | Location Transfer create → Mark Received, same-warehouse error; delivery challan → discrepancy flow (auto-filled school/expected qty, over-receipt blocked, links back to the PR) |
| `reports-dashboard.spec.js` | Dashboard widgets per role; Stock Status, Dispatch Status and Procurement Summary figures, filters, links and CSV export |
| `master-data-crud.spec.js` | Kit create (item rows) / edit (items kept) / delete; School and Vendor create / edit / delete or deactivate; Item discontinue, cancel edit; School/Vendor CSV import; imported master data flowing into a PR, quotations and stock |
| `attachments.spec.js` | Real PDF uploads at every upload step; opening them from the audit trail and who may; corrupt PDF / wrong type rejected; "+ Attach Document"; identical files keep their own names |
| `app-shell.spec.js` | Global search, sidebar collapse, unknown routes; Create PR entry points; single-Item PR estimate; progress-bar back; removing a chosen file; cancelling the discrepancy form; report exports; dashboard figures matching the reports |

## How it works

1. **Global setup** creates four test users (`e2e-field@`, `e2e-manager@`,
   `e2e-admin@`, `e2e-finance@visionempower.test`, plus one with no role), seed
   master data named `E2E …`, and one PR already walked to dispatch — via
   `vision_empower/tests/e2e_fixtures.py`. It then logs each user in once and
   saves the session to `tests/e2e/.state/`.
2. Specs run **one at a time** (they share the site's database).
3. **Global teardown** deletes every `E2E …` record and every record owned by
   the test users, then the users. Set `E2E_KEEP_DATA=1` to skip this and
   inspect the data afterwards.

The fixtures refuse to run unless the site has `allow_tests` enabled, and over
HTTP only for a System Manager — so they can't touch a production site by
accident.

## Run locally (bench on this machine)

```bash
# once per site
bench --site vision.local set-config allow_tests true

# once per machine
cd apps/vision_empower
yarn install
npx playwright install chromium

# bench must be running (bench start), with a fresh build:
bench build --app vision_empower

# run everything (97 tests, ~5–10 min)
npx playwright test

# one spec / one test
npx playwright test pr-workflow
npx playwright test -g "revision"

# watch it in a browser, or step through
npx playwright test --headed
npx playwright test --ui

# report of the last run (screenshots + traces on failure)
npx playwright show-report tests/e2e/.report
```

Defaults: site `vision.local`, URL `http://vision.local:8000`, bench directory
four levels up from this folder. Override with the variables below.

## Run against a cloud site (no bench access)

On a hosted site (e.g. Frappe Cloud) there's no `bench` to shell into, so the
fixtures are called over HTTP instead. You need:

1. **A staging/test site, not production.** Enable `allow_tests` in its site
   config (Frappe Cloud: Site → Site Config → add `allow_tests` = `true`).
2. **An API key for a System Manager user** on that site (User → API Access →
   Generate Keys).
3. The app deployed with this branch, and its assets built.

Then:

```bash
VE_BASE_URL=https://staging.example.frappe.cloud \
VE_API_KEY=<api key> \
VE_API_SECRET=<api secret> \
npx playwright test
```

When `VE_API_KEY` is set, setup/teardown POST to
`/api/method/vision_empower.tests.e2e_fixtures.setup|teardown` with that key;
the test users then log in with their own passwords exactly as locally.

## Environment variables

| Variable | Default | Used for |
|---|---|---|
| `VE_BASE_URL` | `http://vision.local:8000` | Site the browser opens |
| `VE_SITE` | `vision.local` | Site name for `bench --site` (local mode) |
| `VE_BENCH_DIR` | `../../../..` from this folder | Where to run `bench` (local mode) |
| `VE_API_KEY` / `VE_API_SECRET` | — | Switches fixtures to HTTP mode (cloud) |
| `E2E_KEEP_DATA` | — | Skip teardown |

## In CI

Same as the cloud run: point `VE_BASE_URL` at a staging site, put the API key and
secret in CI secrets, and run `npx playwright install --with-deps chromium &&
npx playwright test`. Upload `tests/e2e/.report/` as a build artifact.

## Writing new tests

- Use the helpers in `helpers.js`: `openApp(page, "/route")`, `field(page,
  "Label")` (labels here aren't linked to inputs, so `getByLabel` won't work),
  `toast(page, text)`, `asRole("finance")` for a second role in one test,
  `createPr(browser, { until: "payment" })` to start a PR mid-workflow,
  `callMethod(page, method, args)` to prove the server refuses something the UI
  hides.
- Name any seed data `E2E …` (or create it as a test user) so teardown finds it.
