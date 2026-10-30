// The 8-step Purchase Requisition workflow, driven through the UI by the
// role that owns each step.
const {
	test,
	expect,
	fixtures,
	authFile,
	field,
	openApp,
	toast,
	pngFile,
	today,
	prIdFromUrl,
	createPr,
	selectByText,
	deliveryDate,
} = require("./helpers");

const pill = (page) => page.locator(".ve-selection-summary .ve-pill").first();
const trailStep = (page, label) =>
	page.locator(".ve-vtimeline-item", {
		has: page.locator(".ve-vtimeline-label", { hasText: new RegExp(`^${label}$`) }),
	});

test.describe.serial("happy path — one PR through all 8 steps", () => {
	let prId;

	test("1. Field User raises a kit requisition for two schools", async ({ asRole }) => {
		const page = await asRole("field");
		await openApp(page, "/procurement/new");

		await field(page, "Kit").selectOption({ label: "E2E Braille Kit" });
		await field(page, "Quantity").fill("6");
		await field(page, "Expected Delivery").fill(deliveryDate());
		await page.getByLabel("E2E School North").check();
		await page.getByLabel("E2E School South").check();

		// Project and fund are required; the project pre-selects its fund.
		await page.getByRole("button", { name: "Submit for Approval" }).click();
		await expect(toast(page, "Select the project and the fund.")).toBeVisible();
		await field(page, "Project").selectOption({ label: "E2E Project Seed" });
		await expect(field(page, "Fund")).toHaveValue(fixtures().fund);
		await page.getByRole("button", { name: "Submit for Approval" }).click();

		await expect(page).toHaveURL(/\/procurement\/.+\/status/);
		prId = prIdFromUrl(page.url());
		await expect(page.locator(".ve-view-header h2")).toHaveText(prId);
		await expect(pill(page)).toHaveText("Approval");
		await expect(trailStep(page, "Requisition")).toContainText("submitted the request");
		const summary = page.locator(".ve-selection-summary");
		await expect(summary).toContainText("E2E School North, E2E School South");
		await expect(summary).toContainText("E2E Project Seed");
		await expect(summary).toContainText("E2E Fund Seed");
	});

	test("2. Senior Manager approves from the status page", async ({ asRole }) => {
		const page = await asRole("manager");
		await openApp(page, `/procurement/${prId}/status`);
		await page.getByRole("button", { name: "Go to Approval →" }).click();

		await expect(page.locator(".ve-subtitle").first()).toContainText("E2E Braille Kit × 6");
		// The fund's budget is shown next to the request (6 kits × ₹180 = ₹1,080).
		const budget = page.locator(".ve-budget");
		await expect(budget).toContainText("E2E Fund Seed");
		await expect(budget.locator(".ve-detail-field", { hasText: "Sanctioned" })).toContainText(
			"₹1,00,000"
		);
		await expect(
			budget.locator(".ve-detail-field", { hasText: "Available after this request" })
		).toBeVisible();
		await field(page, "Remarks").fill("Within budget");
		await page.getByRole("button", { name: "Approve" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Quotation Collection");
		await expect(trailStep(page, "Approval")).toContainText("Within budget");
	});

	test("3–4. Admin collects two quotes and selects the cheaper vendor", async ({ asRole }) => {
		const page = await asRole("admin");
		await openApp(page, `/procurement/${prId}/vendor/quotations`);

		// Alpha's prices come from its price list (₹120 / ₹30); Beta has none,
		// so they're typed in. 6 kits = 6 slates + 12 styluses.
		for (const [vendor, prices, ref] of [
			["E2E Vendor Alpha", null, "Q-A"],
			["E2E Vendor Beta", ["100", "25"], "Q-B"],
		]) {
			await selectByText(field(page, "Vendor"), vendor);
			const slate = page.getByLabel("Unit price for E2E Slate");
			const stylus = page.getByLabel("Unit price for E2E Stylus");
			if (prices) {
				// Wait for the (empty) prefill before typing over it.
				await expect(slate).toHaveValue("");
				await slate.fill(prices[0]);
				await stylus.fill(prices[1]);
			} else {
				await expect(slate).toHaveValue("120");
				await expect(stylus).toHaveValue("30");
			}
			await field(page, "Quotation Ref").fill(ref);
			await field(page, "Delivery").fill("7");
			if (vendor.endsWith("Beta"))
				await page.locator('input[type="file"]').setInputFiles(pngFile("quote-beta.png"));
			await page.getByRole("button", { name: "Add Quotation" }).click();
			await expect(toast(page, "Quotation added.").last()).toBeVisible();
		}
		await expect(page.locator(".ve-quotation-table tbody tr")).toHaveCount(2);
		await expect(
			page.locator(".ve-quotation-table tbody tr", { hasText: "E2E Vendor Alpha" })
		).toContainText("₹1,080");
		await expect(
			page.locator(".ve-quotation-table tbody tr", { hasText: "E2E Vendor Beta" })
		).toContainText("₹900");

		await page.locator(".ve-quotation-table tbody tr", { hasText: "E2E Vendor Beta" }).click();
		await expect(page.locator(".ve-selected-vendor")).toHaveText("E2E Vendor Beta");
		await page.getByRole("button", { name: "Proceed with Vendor" }).click();

		await expect(page).toHaveURL(/\/vendor\/selection/);
		await expect(page.locator(".ve-selection-vendor-name").first()).toHaveText(
			"E2E Vendor Beta"
		);

		// Justification is mandatory.
		await page.getByRole("button", { name: "Confirm Vendor Selection" }).click();
		await expect(toast(page, "Please provide a justification")).toBeVisible();

		await page.locator("#justification").fill("Lowest quote");
		await page.getByRole("button", { name: "Confirm Vendor Selection" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Payment Approval");
		await expect(page.locator(".ve-selection-summary").nth(1)).toContainText(
			"E2E Vendor Beta"
		);
		await expect(page.locator(".ve-selection-summary").nth(1)).toContainText("₹900");
		await expect(trailStep(page, "Quotation Collection")).toContainText(
			"closed quotation collection"
		);
		await expect(
			trailStep(page, "Quotation Collection").locator(".ve-vtimeline-attachment")
		).toHaveCount(1);
	});

	test("5. Finance needs an invoice before approving payment", async ({ asRole }) => {
		const page = await asRole("finance");
		await openApp(page, `/procurement/${prId}/payment/approval`);

		await page.getByRole("button", { name: "Approve Payment" }).click();
		await expect(
			toast(page, "Enter the invoice number and upload the vendor invoice")
		).toBeVisible();

		await field(page, "Invoice Number").fill("INV-E2E-77");
		await expect(field(page, "Invoice Amount")).toHaveValue("900");
		await page.locator('input[type="file"]').setInputFiles(pngFile("invoice.png"));
		await page.getByRole("button", { name: "Approve Payment" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Payment Processing");
		await expect(page.locator(".ve-selection-summary").nth(1)).toContainText(
			"INV-E2E-77 (Matched)"
		);
	});

	test("6. Finance records the payment", async ({ asRole }) => {
		const page = await asRole("finance");
		await openApp(page, `/procurement/${prId}/payment/recording`);

		await expect(field(page, "Amount")).toHaveValue("900");
		await field(page, "Payment Mode").selectOption("NEFT");
		await field(page, "Payment Date").fill(today());
		await field(page, "UTR Number").fill("UTR-E2E-1");
		await field(page, "Bank Account").selectOption({ index: 1 });
		await page.getByRole("button", { name: "Record Payment" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Dispatch");
		await expect(trailStep(page, "Payment Processing")).toContainText("UTR UTR-E2E-1");
	});

	test("7. Admin dispatches — one challan per school", async ({ asRole }) => {
		const page = await asRole("admin");
		await openApp(page, `/dispatch/initiation/${prId}`);

		// 6 kits split 3 / 3 by default; send 4 to North and 2 to South.
		const north = page.getByLabel("Quantity for E2E School North");
		const south = page.getByLabel("Quantity for E2E School South");
		await expect(north).toHaveValue("3");
		await expect(south).toHaveValue("3");
		await north.fill("5");
		await field(page, "Transporter").fill("E2E Logistics");
		await field(page, "LR / Docket Number").fill("LR-E2E-9");
		await page.getByRole("button", { name: "Initiate Dispatch" }).click();
		await expect(toast(page, "add up to 8, but the request is for 6")).toBeVisible();
		await north.fill("4");
		await south.fill("2");
		await page.locator('input[type="file"]').setInputFiles(pngFile("transit-insurance.png"));
		await page.getByRole("button", { name: "Initiate Dispatch" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Delivery Confirmation");
		const documents = page.locator(".ve-selection-summary").nth(1);
		await expect(documents).toContainText("→ E2E School North · 4 kit(s) (Dispatched)");
		await expect(documents).toContainText("→ E2E School South · 2 kit(s) (Dispatched)");
	});

	test("8. Each school confirms its own challan; a shortage is recorded", async ({ asRole }) => {
		const page = await asRole("field");
		await openApp(page, `/delivery/confirmation/${prId}`);

		// North first: its 4 kits carried 4 slates and 8 styluses.
		await selectByText(field(page, "Delivery Challan"), "E2E School North");
		await expect(page.locator(".ve-received-items tbody tr")).toHaveCount(2);
		await expect(page.getByLabel("Received E2E Slate")).toHaveValue("4");
		await expect(page.getByLabel("Received E2E Stylus")).toHaveValue("8");
		await field(page, "Received By").fill("Principal, E2E School North");
		await page.getByRole("button", { name: "Confirm Receipt for this School" }).click();
		await expect(toast(page, "upload the signed delivery challan")).toBeVisible();
		await page.locator('input[type="file"]').setInputFiles(pngFile("signed-north.png"));
		await page.getByRole("button", { name: "Confirm Receipt for this School" }).click();
		await expect(toast(page, "1 school(s) still to confirm")).toBeVisible();

		// South: one stylus short — opens a discrepancy, and closes the PR.
		await expect(field(page, "Delivery Challan")).toContainText("E2E School South");
		await page.getByLabel("Received E2E Stylus").fill("3");
		await expect(page.getByText("1 item(s) short")).toBeVisible();
		await field(page, "Received By").fill("Principal, E2E School South");
		await page.locator('input[type="file"]').setInputFiles(pngFile("signed-south.png"));
		await page.getByRole("button", { name: "Confirm Receipt and Close PR" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Completed");
		await expect(page.locator(".ve-vtimeline-item--done")).toHaveCount(8);
		await expect(trailStep(page, "Delivery Confirmation")).toContainText("confirmed delivery");
		const documents = page.locator(".ve-selection-summary").nth(1);
		await expect(documents).toContainText("E2E School North · 4 kit(s) (Delivered, Good)");
		await expect(documents).toContainText("E2E School South · 2 kit(s) (Delivered, Shortage)");
		await expect(documents).toContainText("short by 1");
		// No step is waiting on anyone any more.
		await expect(page.getByRole("heading", { name: "Action" })).toHaveCount(0);
	});
});

test.describe("requisition form validation", () => {
	test.use({ storageState: authFile("field") });

	test("needs a Kit and at least one school", async ({ page }) => {
		await openApp(page, "/procurement/new");
		await field(page, "Quantity").fill("1");
		await field(page, "Expected Delivery").fill(deliveryDate());

		await page.getByRole("button", { name: "Submit for Approval" }).click();
		await expect(toast(page, "Select a Kit for this requisition.")).toBeVisible();

		await field(page, "Kit").selectOption({ label: "E2E Braille Kit" });
		await page.getByRole("button", { name: "Submit for Approval" }).click();
		await expect(toast(page, "Select at least one target school.")).toBeVisible();
		await expect(page).toHaveURL(/\/procurement\/new/);
	});

	test("requisitions are Kit-only (no Item picker)", async ({ page }) => {
		await openApp(page, "/procurement/new");
		await expect(page.locator(".ve-field-label", { hasText: /^\s*Item\s*$/ })).toHaveCount(0);
		await expect(page.locator(".ve-field-label", { hasText: "Quantity" })).toContainText(
			"(Kits)"
		);
	});

	test("quantity is required", async ({ page }) => {
		await openApp(page, "/procurement/new");
		await page.getByRole("button", { name: "Submit for Approval" }).click();
		expect(await field(page, "Quantity").evaluate((el) => el.validity.valueMissing)).toBe(
			true
		);
	});
});

test.describe("rejection", () => {
	test.use({ storageState: authFile("manager") });

	test("a rejected PR is closed and marked ✕ on the trail", async ({
		page,
		browser,
		asRole,
	}) => {
		const prId = await createPr(browser, { until: "approval" });
		await openApp(page, `/procurement/${prId}/approval`);
		await field(page, "Remarks").fill("Duplicate request");
		await page.getByRole("button", { name: "Reject" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Rejected");
		const approval = trailStep(page, "Approval");
		await expect(approval.locator(".ve-pill--danger")).toHaveText("Rejected");
		await expect(approval).toContainText("Duplicate request");
		await expect(page.getByRole("heading", { name: "Action" })).toHaveCount(0);

		// The approval page no longer offers a decision.
		await openApp(page, `/procurement/${prId}/approval`);
		await expect(page.getByText("no approval decision is pending")).toBeVisible();
		await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
	});
});

test.describe("payment revision", () => {
	test.use({ storageState: authFile("finance") });

	test("requesting a revision needs remarks and sends the PR back to Vendor Selection", async ({
		page,
		browser,
		asRole,
	}) => {
		const prId = await createPr(browser, { until: "payment-approval" });
		await openApp(page, `/procurement/${prId}/payment/approval`);

		await page.getByRole("button", { name: "Request Revision" }).click();
		await expect(toast(page, "Add remarks explaining what needs revising.")).toBeVisible();

		await field(page, "Remarks").fill("GST missing on quote");
		await page.getByRole("button", { name: "Request Revision" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Vendor Selection");
		await expect(trailStep(page, "Payment Approval")).toContainText(
			"sent back to Vendor Selection"
		);
		await expect(trailStep(page, "Payment Approval")).toContainText("GST missing on quote");
		await expect(page.locator(".ve-selection-summary").nth(1)).toHaveCount(0); // PO cancelled, no documents yet

		// Admin can now re-select.
		const admin = await asRole("admin");
		await openApp(admin, `/procurement/${prId}/vendor/selection`);
		await admin.locator("#justification").fill("Revised quote accepted");
		await admin.getByRole("button", { name: "Confirm Vendor Selection" }).click();
		await expect(pill(admin)).toHaveText("Payment Approval");
	});
});

test.describe("steps are view-only for the wrong role or the wrong stage", () => {
	test("Finance sees the approval page read-only", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "approval" });
		const page = await asRole("finance");
		await openApp(page, `/procurement/${prId}/approval`);
		await expect(page.getByText("Your role doesn't approve requisitions")).toBeVisible();
		await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);

		await openApp(page, `/procurement/${prId}/status`);
		await expect(page.getByText("waiting on another role at the Approval step")).toBeVisible();
	});

	test("Senior Manager can't raise a requisition", async ({ asRole }) => {
		const page = await asRole("manager");
		await openApp(page, "/procurement/new");
		await expect(page.getByText("Your role doesn't raise requisitions")).toBeVisible();
		await expect(page.getByRole("button", { name: "Submit for Approval" })).toHaveCount(0);
	});

	test("Admin can't dispatch a PR that isn't paid yet", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "approval" });
		const page = await asRole("admin");
		await openApp(page, `/dispatch/initiation/${prId}`);
		await expect(page.getByText("Dispatch isn't pending")).toBeVisible();
		await expect(page.getByRole("button", { name: "Initiate Dispatch" })).toHaveCount(0);
	});

	test("dispatch date can't be before the request date", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "dispatch" });
		const page = await asRole("admin");
		await openApp(page, `/dispatch/initiation/${prId}`);
		await field(page, "Dispatch Date").fill("2020-01-01");
		await field(page, "Transporter").fill("E2E Logistics");
		await field(page, "LR / Docket Number").fill("LR-OLD");
		await page.getByRole("button", { name: "Initiate Dispatch" }).click();
		await expect(toast(page, "Could not initiate dispatch.")).toBeVisible();
		await expect(page.locator(".msgprint")).toContainText("can't be before the request date");
		await expect(page).toHaveURL(/\/dispatch\/initiation\//);
	});

	test("Field User can't confirm delivery before dispatch", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "payment" });
		const page = await asRole("field");
		await openApp(page, `/delivery/confirmation/${prId}`);
		await expect(page.getByText("Delivery confirmation isn't pending")).toBeVisible();
	});

	test("PR list shows every request with its stage", async ({ asRole }) => {
		const { dispatched_pr } = fixtures();
		const page = await asRole("finance");
		await openApp(page, "/procurement");
		const row = page.locator(".ve-data-table tbody tr", { hasText: dispatched_pr });
		await expect(row).toContainText("Delivery Confirmation");
		await row.click();
		await expect(page).toHaveURL(new RegExp(`/procurement/${dispatched_pr}/status`));
	});
});

test.describe("the status page leads to the waiting step", () => {
	test("Admin sees 'Go to Quotation Collection' without scrolling", async ({
		browser,
		asRole,
	}) => {
		const prId = await createPr(browser, { until: "quotations" });
		const page = await asRole("admin");
		await openApp(page, `/procurement/${prId}/status`);

		const go = page.getByRole("button", { name: "Go to Quotation Collection →" });
		await expect(go).toBeInViewport();
		await go.click();
		await expect(page).toHaveURL(new RegExp(`/procurement/${prId}/vendor/quotations`));
		await expect(page.getByRole("heading", { name: "Add Quotation" })).toBeVisible();
	});
});
