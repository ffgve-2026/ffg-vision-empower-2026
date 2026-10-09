// App shell (search, sidebar, unknown routes), entry points, small step-page
// controls, report exports, a single-Item PR, and dashboard figures matching
// the reports they summarise.
const fs = require("fs");
const { test, expect, authFile, field, openApp, toast, createPr, pngFile } = require("./helpers");

test.describe("app shell", () => {
	test.use({ storageState: authFile("admin") });

	test("global search finds a record and opens it", async ({ page }) => {
		await openApp(page, "/");
		await page.locator(".ve-search").fill("E2E Vendor Alpha");
		const result = page.locator(".ve-search-result-item", { hasText: "E2E Vendor Alpha" });
		await expect(result.locator(".ve-search-result-type")).toHaveText(/Vendor/);
		await result.click();
		await expect(page).toHaveURL(/\/master-data\/vendors\/VE-VEN-/);
		await expect(page.locator(".ve-view")).toContainText("E2E Vendor Alpha");
	});

	test("global search finds schools, items and kits too", async ({ page }) => {
		await openApp(page, "/");
		for (const [term, route] of [
			["E2E School North", /\/master-data\/schools\//],
			["E2E Slate", /\/master-data\/items\//],
			["E2E Braille Kit", /\/master-data\/kits\//],
		]) {
			await page.locator(".ve-search").fill(term);
			await page.locator(".ve-search-result-item", { hasText: term }).first().click();
			await expect(page).toHaveURL(route);
		}
	});

	test("global search with no match says so", async ({ page }) => {
		await openApp(page, "/");
		await page.locator(".ve-search").fill("zz-no-such-record-zz");
		await expect(page.locator(".ve-search-empty")).toHaveText("No matches found.");
	});

	test("sidebar collapses and expands", async ({ page }) => {
		await openApp(page, "/");
		await page.getByRole("button", { name: "◀ Collapse Sidebar" }).click();
		await expect(page.locator(".ve-shell")).toHaveClass(/ve-shell--collapsed/);
		await page.getByRole("button", { name: "▶" }).click();
		await expect(page.locator(".ve-shell")).not.toHaveClass(/ve-shell--collapsed/);
	});

	test("an unknown route shows Not available", async ({ page }) => {
		await openApp(page, "/does/not/exist");
		await expect(page.getByRole("heading", { name: "Not available" })).toBeVisible();
	});
});

test.describe("entry points into a new requisition", () => {
	test.use({ storageState: authFile("field") });

	test("Dashboard → Create PR", async ({ page }) => {
		await openApp(page, "/");
		await page.getByRole("button", { name: "Create PR", exact: true }).click();
		await expect(page).toHaveURL(/\/procurement\/new/);
	});

	test("Procurement list → New Requisition", async ({ page }) => {
		await openApp(page, "/procurement");
		await page.getByRole("button", { name: "New Requisition" }).click();
		await expect(page).toHaveURL(/\/procurement\/new/);
	});

	test("a PR for a single Item uses that item's price for the estimate", async ({ page, asRole }) => {
		await openApp(page, "/procurement/new");
		await field(page, "Item").selectOption({ label: "E2E Stylus" });
		await field(page, "Quantity").fill("5");
		await field(page, "Expected Delivery").fill("2026-12-31");
		await page.getByLabel("E2E School North").check();
		await page.getByRole("button", { name: "Submit for Approval" }).click();
		await expect(page).toHaveURL(/\/status/);
		await expect(page.locator(".ve-view-header .ve-subtitle")).toHaveText("E2E Stylus");
		const prId = decodeURIComponent(page.url().match(/procurement\/([^/]+)\/status/)[1]);

		const manager = await asRole("manager");
		await openApp(manager, `/procurement/${prId}/approval`);
		await expect(manager.locator(".ve-subtitle").first()).toContainText("E2E Stylus × 5");
		// Vendor Alpha's stylus price is ₹30.
		await expect(manager.locator(".ve-detail-field", { hasText: "Estimated Value" })).toContainText("₹150");
	});
});

test.describe("step-page controls", () => {
	test("the progress bar's back button returns to the previous page", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "approval" });
		const page = await asRole("manager");
		await openApp(page, `/procurement/${prId}/status`);
		await page.getByRole("button", { name: "Go to Approval →" }).click();
		await expect(page).toHaveURL(/\/approval/);
		await page.getByRole("button", { name: "← Back to Requisition" }).click();
		await expect(page).toHaveURL(/\/status/);
	});

	for (const [step, until, role, route, fileBox] of [
		["payment approval", "payment-approval", "finance", (id) => `/procurement/${id}/payment/approval`, ".ve-invoice-file"],
		["dispatch", "dispatch", "admin", (id) => `/dispatch/initiation/${id}`, ".ve-dispatch-file"],
		["delivery", "delivery", "field", (id) => `/delivery/confirmation/${id}`, ".ve-delivery-file"],
	]) {
		test(`a chosen file can be removed before submitting (${step})`, async ({ browser, asRole }) => {
			const prId = await createPr(browser, { until });
			const page = await asRole(role);
			await openApp(page, route(prId));
			await page.locator('input[type="file"]').setInputFiles(pngFile("wrong-file.png"));
			await expect(page.locator(fileBox)).toContainText("wrong-file.png");
			await page.locator(fileBox).getByRole("button", { name: "Remove" }).click();
			await expect(page.locator(fileBox)).toHaveCount(0);
			await expect(page.locator('input[type="file"]')).toHaveCount(1); // picker is back
		});
	}

	test("the discrepancy form can be cancelled", async ({ asRole }) => {
		const page = await asRole("field");
		await openApp(page, "/dispatch");
		await page.getByRole("button", { name: "Report New Discrepancy" }).click();
		await expect(page.getByRole("heading", { name: "Report New Discrepancy" })).toBeVisible();
		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.getByRole("heading", { name: "Report New Discrepancy" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Report New Discrepancy" })).toBeVisible();
	});
});

test.describe("report exports and links", () => {
	test.use({ storageState: authFile("admin") });

	test("Dispatch Status: Download Report and the discrepancy-log link", async ({ page }) => {
		await openApp(page, "/reports/dispatch-status");
		await page.locator(".ve-toolbar select").nth(1).selectOption("");
		const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download Report" }).click()]);
		expect(download.suggestedFilename()).toBe("vision-empower-dispatch-status.csv");
		const content = fs.readFileSync(await download.path(), "utf-8");
		expect(content.split("\n")[0]).toContain("DC Number");
		expect(content).toContain("E2E School North");

		await page.getByRole("button", { name: "View Delivery Discrepancy Log →" }).click();
		await expect(page).toHaveURL(/#\/dispatch$/);
	});

	test("Stock Status: Export PDF opens the print dialog", async ({ page }) => {
		await openApp(page, "/reports/stock-status");
		await page.evaluate(() => {
			window.__printed = 0;
			window.print = () => window.__printed++;
		});
		await page.getByRole("button", { name: "Export PDF" }).click();
		expect(await page.evaluate(() => window.__printed)).toBe(1);
	});
});

test.describe("dashboard figures match the reports", () => {
	test("reorder alert shows the same on-hand qty as Stock Status", async ({ asRole }) => {
		const page = await asRole("field");
		await openApp(page, "/reports/stock-status");
		const slate = page.locator(".ve-data-table tbody tr", { hasText: "E2E Slate" });
		const inHand = (await slate.locator("td").nth(5).innerText()).trim();
		const reorder = (await slate.locator("td").nth(6).innerText()).trim();

		await openApp(page, "/");
		const alert = page.locator(".ve-alert-row", { hasText: "E2E Slate" });
		await expect(alert).toContainText(`Min Level Req: ${reorder}`);
		await expect(alert).toContainText(`${inHand} Nos Left`);
		await expect(page.locator(".ve-kpi-value").nth(1)).toHaveText(/^\d+% Complete$/);
	});

	test("Total PO value KPI equals this month's spend on the Procurement Summary", async ({ asRole }) => {
		const page = await asRole("finance");
		await openApp(page, "/reports/procurement-summary");
		await page.locator(".ve-toolbar select").first().selectOption({ label: "This Month" });
		const spend = page.locator(".ve-kpi-value").nth(1);
		await expect(spend).toHaveText(/₹/);
		const spendText = (await spend.innerText()).trim();

		await openApp(page, "/");
		const card = page.locator(".ve-widget", { has: page.locator(".ve-kpi-label", { hasText: "TOTAL PO VALUE THIS MONTH" }) });
		await expect(card.locator(".ve-kpi-value")).toHaveText(spendText);
	});
});
