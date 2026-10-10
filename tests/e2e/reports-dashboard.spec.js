// Dashboard (per-role widgets) and the three reports, all computed from the
// seeded PR (paid and dispatched to two schools).
const fs = require("fs");
const { test, expect, fixtures, authFile, openApp, createPr } = require("./helpers");

const kpi = (page, label) => page.locator(".ve-kpi-label", { hasText: label });
// A downloaded CSV's data rows (header dropped), checking the UTF-8 BOM
// Excel needs is there.
async function csvRows(page, button) {
	const [download] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: button }).click(),
	]);
	const text = fs.readFileSync(await download.path(), "utf-8");
	expect(text.charCodeAt(0)).toBe(0xfeff);
	return { name: download.suggestedFilename(), rows: text.slice(1).split("\n").slice(1) };
}

const widget = (page, title) =>
	page.locator(".ve-widget", { has: page.locator(".ve-widget-title", { hasText: title }) });

test.describe("Dashboard is scoped per role", () => {
	test("Field User: reorder alerts and their own requisitions, no spend figures", async ({
		asRole,
		browser,
	}) => {
		// "My Requisitions" lists the 10 most recent, so use a fresh PR.
		const myPr = await createPr(browser, { until: "approval" });
		const page = await asRole("field");
		await openApp(page, "/");
		await expect(kpi(page, "ITEMS BELOW REORDER")).toBeVisible();
		await expect(kpi(page, "SCHOOLS DISPATCHED")).toBeVisible();
		await expect(kpi(page, "TOTAL PO VALUE THIS MONTH")).toHaveCount(0);
		await expect(kpi(page, "PENDING PAYMENTS")).toHaveCount(0);

		// Slate: 10 on hand vs reorder level 50.
		await expect(widget(page, "Critical Reorder Alerts")).toContainText("E2E Slate");
		await expect(widget(page, "My Requisitions")).toContainText(myPr);
		await expect(widget(page, "Pending PR Approvals")).toHaveCount(0);
	});

	test("Senior Manager: pending approvals lead to the approval page", async ({
		asRole,
		browser,
	}) => {
		const prId = await createPr(browser, { until: "approval" });
		const page = await asRole("manager");
		await openApp(page, "/");
		const approvals = widget(page, "Pending PR Approvals");
		await expect(approvals).toContainText(prId);
		await approvals
			.locator(".ve-approval-row", { hasText: prId })
			.getByRole("button", { name: "Approve" })
			.click();
		await expect(page).toHaveURL(new RegExp(`/procurement/${prId}/approval`));
	});

	test("Finance: payment figures and payments queue, no reorder alerts", async ({ asRole }) => {
		const page = await asRole("finance");
		await openApp(page, "/");
		await expect(kpi(page, "PENDING PAYMENTS")).toBeVisible();
		await expect(kpi(page, "TOTAL PO VALUE THIS MONTH")).toBeVisible();
		await expect(widget(page, "Payments Queue")).toBeVisible();
		await expect(widget(page, "Critical Reorder Alerts")).toHaveCount(0);
	});

	test("Procurement Requests widget opens the PR's audit trail", async ({ asRole }) => {
		const { dispatched_pr } = fixtures();
		const page = await asRole("admin");
		await openApp(page, "/");
		await widget(page, "Procurement Requests").getByText(dispatched_pr).click();
		await expect(page).toHaveURL(new RegExp(`/procurement/${dispatched_pr}/status`));
	});
});

test.describe("Reports", () => {
	test.use({ storageState: authFile("admin") });

	test("Stock Status: derived on-hand, reorder status, category filter, item link", async ({
		page,
	}) => {
		await openApp(page, "/reports/stock-status");
		const slate = page.locator(".ve-data-table tbody tr", { hasText: "E2E Slate" });
		await expect(slate).toContainText("Below Reorder");
		const cells = slate.locator("td");
		const [procured, dispatched, inHand] = await Promise.all(
			[3, 4, 5].map(async (i) => Number(await cells.nth(i).innerText()))
		);
		expect(inHand).toBe(procured - dispatched);
		await expect(
			page.locator(".ve-data-table tbody tr", { hasText: "E2E Stylus" })
		).toContainText("Stock OK");
		await expect(page.getByRole("button", { name: "Sync RFID" })).toHaveCount(0);

		await page.locator(".ve-toolbar select").first().selectOption("Lab");
		await expect(slate).toHaveCount(0);
		await page.locator(".ve-toolbar select").first().selectOption("Braille");
		await slate.locator(".ve-link").click();
		await expect(page).toHaveURL(/\/master-data\/items\/VE-ITM-/);
	});

	test("Dispatch Status: the download has every row in the table", async ({ page }) => {
		const { challans } = fixtures();
		await openApp(page, "/reports/dispatch-status");
		await page.locator(".ve-toolbar select").nth(1).selectOption("");
		await expect(
			page.locator(".ve-data-table tbody tr", { hasText: challans[0] })
		).toBeVisible();
		const onScreen = await page.locator(".ve-data-table tbody tr").count();

		const { name, rows } = await csvRows(page, "Download Report");
		expect(name).toBe("vision-empower-dispatch-status.csv");
		expect(rows).toHaveLength(onScreen);
		for (const dc of challans) expect(rows.some((r) => r.includes(dc))).toBe(true);
	});

	test("Stock Status: Export PDF prints only the report", async ({ page }) => {
		await openApp(page, "/reports/stock-status");
		await expect(page.locator(".ve-data-table tbody tr").first()).toBeVisible();
		await page.emulateMedia({ media: "print" });
		for (const chrome of [".ve-sidebar", ".ve-topbar", ".ve-toolbar"])
			await expect(page.locator(chrome).first()).toBeHidden();
		// The last column isn't clipped by the table's scroll wrapper.
		const wrapper = page.locator(".ve-table-wrapper").first();
		const fits = await wrapper.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
		expect(fits).toBe(true);
		await expect(page.locator(".ve-data-table th", { hasText: "Status" })).toBeVisible();
	});

	test("Dispatch Status: one row per challan, state filter, challan opens the PR", async ({
		page,
	}) => {
		const { challans, dispatched_pr } = fixtures();
		await openApp(page, "/reports/dispatch-status");
		await page.locator(".ve-toolbar select").nth(1).selectOption("");
		await page.locator(".ve-toolbar select").first().selectOption("E2E State");
		for (const dc of challans)
			await expect(page.locator(".ve-data-table tbody tr", { hasText: dc })).toBeVisible();
		await expect(
			page.locator(".ve-data-table tbody tr", { hasText: challans[0] })
		).toContainText("E2E School North");

		await page
			.locator(".ve-data-table tbody tr", { hasText: challans[0] })
			.locator(".ve-link")
			.click();
		await expect(page).toHaveURL(new RegExp(`/procurement/${dispatched_pr}/status`));
	});

	test("Procurement Summary: vendor ledger, vendor filter, CSV export", async ({ page }) => {
		await openApp(page, "/reports/procurement-summary");
		await page.locator(".ve-toolbar select").first().selectOption({ label: "All Time" });
		await page
			.locator(".ve-toolbar select")
			.nth(1)
			.selectOption({ label: "E2E Vendor Alpha" });

		const ledger = page.locator(".ve-data-table tbody tr");
		await expect(ledger.filter({ hasText: "E2E Vendor Alpha" })).toHaveCount(1);
		await expect(ledger.filter({ hasText: "E2E Vendor Beta" })).toHaveCount(0);
		await expect(page.locator(".ve-bar-label", { hasText: "E2E Vendor Alpha" })).toBeVisible();

		const { name, rows } = await csvRows(page, "Export CSV");
		expect(name).toBe("vision-empower-procurement-summary.csv");
		expect(rows).toHaveLength(await ledger.count());
		expect(rows[0]).toContain("E2E Vendor Alpha");
	});
});
