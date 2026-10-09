// Takes every screenshot used in docs/user-guide/README.md.
// Run: npx playwright test -c playwright.docs.config.js
const path = require("path");
const { test, expect, fixtures, authFile, field, openApp, selectByText } = require("../../../tests/e2e/helpers");

const IMAGES = path.join(__dirname, "..", "images");

async function settle(page) {
	await page.waitForLoadState("networkidle");
	await expect(page.locator(".ve-widget-loading")).toHaveCount(0);
	await page.mouse.move(0, 0);
}

// Desk's own sidebar controls overlap the app's left edge; hide them for
// the screenshot.
const CAPTURE_CSS = ".sidebar-toggle-btn, .sidebar-resize-handle { display: none !important; }";

// The app scrolls inside a window-sized frame and Desk only paints what's in
// the window, so grow the window to fit the content, then capture.
async function shoot(page, name, target = ".ve-shell") {
	await page.addStyleTag({ content: CAPTURE_CSS });
	await settle(page);
	const overflow = await page.locator(".ve-content").evaluate((el) => el.scrollHeight - el.clientHeight);
	const viewport = page.viewportSize();
	if (overflow > 0) {
		await page.setViewportSize({ width: viewport.width, height: viewport.height + overflow });
		await settle(page);
	}
	await page.locator(target).first().screenshot({ path: path.join(IMAGES, `${name}.png`), animations: "disabled", caret: "hide" });
	await page.setViewportSize(viewport);
}

// [file name, role, route (fn of demo fixtures), optional prep(page, fixtures)]
const SHOTS = [
	["dashboard-field-user", "field", () => "/"],
	["dashboard-senior-manager", "manager", () => "/"],
	["dashboard-admin", "admin", () => "/"],
	["dashboard-finance", "finance", () => "/"],
	[
		"global-search",
		"admin",
		() => "/",
		async (page) => {
			await page.locator(".ve-search").fill("PR-2026");
			await expect(page.locator(".ve-search-result-item").first()).toBeVisible();
		},
	],
	["procurement-list", "manager", () => "/procurement"],
	[
		"step-1-requisition",
		"field",
		() => "/procurement/new",
		async (page) => {
			await field(page, "Kit").selectOption({ label: "Braille Starter Kit" });
			await field(page, "Quantity").fill("10");
			await field(page, "Expected Delivery").fill("2026-11-30");
			await page.getByLabel("Govt Middle School, Gaya").check();
			await page.getByLabel("Patna Girls Senior Academy").check();
			await field(page, "Remarks").fill("For the new Braille class starting next term.");
		},
	],
	["step-2-approval", "manager", (f) => `/procurement/${f.prs.approval}/approval`],
	["step-3-quotations", "admin", (f) => `/procurement/${f.prs.quotations}/vendor/quotations`],
	["step-4-vendor-selection", "admin", (f) => `/procurement/${f.prs.vendor_selection}/vendor/selection`],
	["step-5-payment-approval", "finance", (f) => `/procurement/${f.prs.payment_approval}/payment/approval`],
	["step-6-payment", "finance", (f) => `/procurement/${f.prs.payment}/payment/recording`],
	["step-7-dispatch", "admin", (f) => `/dispatch/initiation/${f.prs.dispatch}`],
	["step-8-delivery", "field", (f) => `/delivery/confirmation/${f.prs.delivery}`],
	["status-page-completed", "manager", (f) => `/procurement/${f.prs.completed}/status`],
	["status-page-waiting", "field", (f) => `/procurement/${f.prs.payment_approval}/status`],
	["view-only-step", "finance", (f) => `/procurement/${f.prs.approval}/approval`],
	["master-vendors", "admin", () => "/master-data/vendors"],
	["master-vendor-detail", "admin", (f) => `/master-data/vendors/${f.vendor}`],
	["master-schools", "admin", () => "/master-data/schools"],
	["master-items", "admin", () => "/master-data/items"],
	["master-kits", "admin", () => "/master-data/kits"],
	["master-kit-detail", "admin", (f) => `/master-data/kits/${f.kit}`],
	["master-vendor-prices", "admin", () => "/master-data/vendor-prices"],
	["inventory-transfers", "admin", () => "/inventory"],
	["dispatch-discrepancy-log", "field", () => "/dispatch"],
	[
		"dispatch-report-discrepancy",
		"field",
		() => "/dispatch",
		async (page) => {
			await page.getByRole("button", { name: "Report New Discrepancy" }).click();
			await selectByText(field(page, "Delivery Challan"), "Ranchi Inclusive School");
			await field(page, "Item").selectOption({ label: "Braille Paper Ream" });
			await field(page, "Received Quantity").fill("6");
			await field(page, "Action Taken").fill("Vendor notified");
		},
	],
	["report-procurement-summary", "manager", () => "/reports/procurement-summary"],
	["report-stock-status", "manager", () => "/reports/stock-status"],
	["report-dispatch-status", "manager", () => "/reports/dispatch-status"],
];

for (const [name, role, route, prep] of SHOTS) {
	test(name, async ({ browser }) => {
		const context = await browser.newContext({ storageState: authFile(role) });
		const page = await context.newPage();
		await openApp(page, route(fixtures()));
		if (prep) await prep(page, fixtures());
		await shoot(page, name);
		await context.close();
	});
}

test("login", async ({ browser }) => {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto("/login");
	await expect(page.locator("#login_email")).toBeVisible();
	await page.screenshot({ path: path.join(IMAGES, "login.png") });
	await context.close();
});
