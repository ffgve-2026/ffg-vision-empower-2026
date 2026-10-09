// Inventory (Location Transfer) and Dispatch & Logistics (delivery challans
// and the discrepancies reported against them).
const {
	test,
	expect,
	fixtures,
	authFile,
	field,
	openApp,
	toast,
	callMethod,
	selectByText,
} = require("./helpers");

test.describe("Location Transfer", () => {
	test.use({ storageState: authFile("admin") });

	test("submit a transfer, then mark it received", async ({ page }) => {
		await openApp(page, "/inventory");
		await selectByText(field(page, "Item"), "E2E Slate");
		await field(page, "Quantity").fill("3");
		await field(page, "From Location").selectOption({ label: "E2E Warehouse A" });
		await field(page, "To Location").selectOption({ label: "E2E Warehouse B" });
		await field(page, "Reason").fill("E2E restock");
		await page.getByRole("button", { name: "Submit Transfer" }).click();
		await expect(toast(page, "Transfer submitted.")).toBeVisible();

		const row = page
			.locator(".ve-data-table tbody tr", { hasText: "E2E Warehouse B" })
			.first();
		await expect(row).toContainText("In Transit");
		await row.click();

		await expect(page).toHaveURL(/\/inventory\/transfers\/TRF-/);
		await page.getByRole("button", { name: "Mark Received" }).click();
		await expect(toast(page, "marked as received")).toBeVisible();
		await expect(page.locator(".ve-status-text")).toHaveText("Completed");
		await expect(page.getByRole("button", { name: "Mark Received" })).toHaveCount(0);
	});

	test("from and to can't be the same warehouse", async ({ page }) => {
		await openApp(page, "/inventory");
		await selectByText(field(page, "Item"), "E2E Slate");
		await field(page, "Quantity").fill("1");
		await field(page, "From Location").selectOption({ label: "E2E Warehouse A" });
		await field(page, "To Location").selectOption({ label: "E2E Warehouse A" });
		await page.getByRole("button", { name: "Submit Transfer" }).click();
		await expect(toast(page, "Failed to submit the transfer.")).toBeVisible();
		await expect(page.locator(".msgprint")).toContainText(
			"From and To locations must be different."
		);
	});

	test("Field User can see transfers but not raise one", async ({ asRole }) => {
		const page = await asRole("field");
		await openApp(page, "/inventory");
		await expect(page.getByRole("heading", { name: "Recent Transfers" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Submit Transfer" })).toHaveCount(0);
	});
});

test.describe("Delivery challans → discrepancies", () => {
	test.use({ storageState: authFile("field") });

	test("report a shortage against a challan; school and expected qty come from the challan", async ({
		page,
	}) => {
		const { challans, dispatched_pr } = fixtures();
		await openApp(page, "/dispatch");
		await page.getByRole("button", { name: "Report New Discrepancy" }).click();

		await selectByText(field(page, "Delivery Challan"), challans[0]);
		await expect(field(page, "School")).toHaveValue("E2E School North");
		await field(page, "Item").selectOption({ label: "E2E Slate" });
		// 4 kits × 1 slate, split over 2 schools.
		await expect(field(page, "Expected Quantity")).toHaveValue("2");
		await field(page, "Received Quantity").fill("1");
		await field(page, "Action Taken").fill("Vendor notified");
		await page.getByRole("button", { name: "Submit" }).click();
		await expect(toast(page, "Discrepancy reported.")).toBeVisible();

		const row = page.locator(".ve-data-table tbody tr", { hasText: challans[0] }).first();
		await expect(row).toContainText("E2E School North");
		await expect(row).toContainText("E2E Slate");
		await expect(row.locator("td").nth(5)).toHaveText("1"); // shortage

		// The DC number opens the PR it was dispatched under…
		await row.locator(".ve-link").click();
		await expect(page).toHaveURL(new RegExp(`/procurement/${dispatched_pr}/status`));
		const discrepancies = page.locator(".ve-selection-summary-item", {
			hasText: "Delivery Discrepancies",
		});
		await expect(discrepancies).toContainText(`${challans[0]}: `);
		await expect(discrepancies).toContainText("short by 1");

		// …and the discrepancy itself links back to that PR.
		await discrepancies.locator(".ve-link").first().click();
		await expect(page).toHaveURL(/\/dispatch\/discrepancies\//);
		await page
			.locator(".ve-detail-field", { hasText: "Procurement Request" })
			.locator(".ve-link")
			.click();
		await expect(page).toHaveURL(new RegExp(`/procurement/${dispatched_pr}/status`));
	});

	test("the second school's challan carries its own school", async ({ page }) => {
		const { challans } = fixtures();
		await openApp(page, "/dispatch");
		await page.getByRole("button", { name: "Report New Discrepancy" }).click();
		await selectByText(field(page, "Delivery Challan"), challans[1]);
		await expect(field(page, "School")).toHaveValue("E2E School South");
		await field(page, "Item").selectOption({ label: "E2E Stylus" });
		await expect(field(page, "Expected Quantity")).toHaveValue("4");
	});

	test("received can't exceed expected — blocked in the form and on the server", async ({
		page,
	}) => {
		const { challans, items } = fixtures();
		await openApp(page, "/dispatch");
		await page.getByRole("button", { name: "Report New Discrepancy" }).click();
		await selectByText(field(page, "Delivery Challan"), challans[0]);
		await field(page, "Item").selectOption({ label: "E2E Slate" });
		await field(page, "Received Quantity").fill("3");
		await page.getByRole("button", { name: "Submit" }).click();
		expect(
			await field(page, "Received Quantity").evaluate((el) => el.validity.rangeOverflow)
		).toBe(true);
		await expect(toast(page, "Discrepancy reported.")).toHaveCount(0);

		const res = await callMethod(
			page,
			"vision_empower.api.delivery_discrepancy.report_delivery_discrepancy",
			{
				dc_number: challans[0],
				item: items.slate,
				received_qty: "5",
			}
		);
		expect(res.status).toBe(417);
		expect(JSON.stringify(res.body)).toContain("cannot be greater than expected quantity");
	});

	test("challan and item are required", async ({ page }) => {
		await openApp(page, "/dispatch");
		await page.getByRole("button", { name: "Report New Discrepancy" }).click();
		await page.getByRole("button", { name: "Submit" }).click();
		expect(
			await field(page, "Delivery Challan").evaluate((el) => el.validity.valueMissing)
		).toBe(true);
		await expect(field(page, "Item")).toBeDisabled();
	});
});
