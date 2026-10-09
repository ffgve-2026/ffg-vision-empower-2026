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
} = require("./helpers");

const pill = (page) => page.locator(".ve-selection-summary .ve-pill").first();
const trailStep = (page, label) =>
	page.locator(".ve-vtimeline-item", { has: page.locator(".ve-vtimeline-label", { hasText: new RegExp(`^${label}$`) }) });

test.describe.serial("happy path — one PR through all 8 steps", () => {
	let prId;

	test("1. Field User raises a kit requisition for two schools", async ({ asRole }) => {
		const page = await asRole("field");
		await openApp(page, "/procurement/new");

		await field(page, "Kit").selectOption({ label: "E2E Braille Kit" });
		await field(page, "Quantity").fill("6");
		await field(page, "Expected Delivery").fill("2026-12-31");
		await page.getByLabel("E2E School North").check();
		await page.getByLabel("E2E School South").check();
		await page.getByRole("button", { name: "Submit for Approval" }).click();

		await expect(page).toHaveURL(/\/procurement\/.+\/status/);
		prId = prIdFromUrl(page.url());
		await expect(page.locator(".ve-view-header h2")).toHaveText(prId);
		await expect(pill(page)).toHaveText("Approval");
		await expect(trailStep(page, "Requisition")).toContainText("submitted the request");
		await expect(page.locator(".ve-selection-summary")).toContainText("E2E School North, E2E School South");
	});

	test("2. Senior Manager approves from the status page", async ({ asRole }) => {
		const page = await asRole("manager");
		await openApp(page, `/procurement/${prId}/status`);
		await page.getByRole("button", { name: "Go to Approval →" }).click();

		await expect(page.locator(".ve-subtitle").first()).toContainText("E2E Braille Kit × 6");
		await field(page, "Remarks").fill("Within budget");
		await page.getByRole("button", { name: "Approve" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Quotation Collection");
		await expect(trailStep(page, "Approval")).toContainText("Within budget");
	});

	test("3–4. Admin collects two quotes and selects the cheaper vendor", async ({ asRole }) => {
		const page = await asRole("admin");
		await openApp(page, `/procurement/${prId}/vendor/quotations`);

		for (const [vendor, amount, ref] of [["E2E Vendor Alpha", "1500", "Q-A"], ["E2E Vendor Beta", "1200", "Q-B"]]) {
			await field(page, "Vendor").selectOption({ label: vendor });
			await field(page, "Total Amount").fill(amount);
			await field(page, "Quotation Ref").fill(ref);
			await field(page, "Delivery").fill("7");
			if (vendor.endsWith("Beta")) await page.locator('input[type="file"]').setInputFiles(pngFile("quote-beta.png"));
			await page.getByRole("button", { name: "Add Quotation" }).click();
			await expect(toast(page, "Quotation added.").last()).toBeVisible();
		}
		await expect(page.locator(".ve-quotation-table tbody tr")).toHaveCount(2);

		await page.locator(".ve-quotation-table tbody tr", { hasText: "E2E Vendor Beta" }).click();
		await expect(page.locator(".ve-selected-vendor")).toHaveText("E2E Vendor Beta");
		await page.getByRole("button", { name: "Proceed with Vendor" }).click();

		await expect(page).toHaveURL(/\/vendor\/selection/);
		await expect(page.locator(".ve-selection-vendor-name").first()).toHaveText("E2E Vendor Beta");

		// Justification is mandatory.
		await page.getByRole("button", { name: "Confirm Vendor Selection" }).click();
		await expect(toast(page, "Please provide a justification")).toBeVisible();

		await page.locator("#justification").fill("Lowest quote");
		await page.getByRole("button", { name: "Confirm Vendor Selection" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Payment Approval");
		await expect(page.locator(".ve-selection-summary").nth(1)).toContainText("E2E Vendor Beta");
		await expect(trailStep(page, "Quotation Collection")).toContainText("closed quotation collection");
		await expect(trailStep(page, "Quotation Collection").locator(".ve-vtimeline-attachment")).toHaveCount(1);
	});

	test("5. Finance needs an invoice before approving payment", async ({ asRole }) => {
		const page = await asRole("finance");
		await openApp(page, `/procurement/${prId}/payment/approval`);

		await page.getByRole("button", { name: "Approve Payment" }).click();
		await expect(toast(page, "Enter the invoice number and upload the vendor invoice")).toBeVisible();

		await field(page, "Invoice Number").fill("INV-E2E-77");
		await expect(field(page, "Invoice Amount")).toHaveValue("1200");
		await page.locator('input[type="file"]').setInputFiles(pngFile("invoice.png"));
		await page.getByRole("button", { name: "Approve Payment" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Payment Processing");
		await expect(page.locator(".ve-selection-summary").nth(1)).toContainText("INV-E2E-77 (Matched)");
	});

	test("6. Finance records the payment", async ({ asRole }) => {
		const page = await asRole("finance");
		await openApp(page, `/procurement/${prId}/payment/recording`);

		await expect(field(page, "Amount")).toHaveValue("1200");
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

		await expect(page.getByText("One delivery challan will be raised per target school")).toContainText("E2E School North, E2E School South");
		await field(page, "Transporter").fill("E2E Logistics");
		await field(page, "LR / Docket Number").fill("LR-E2E-9");
		await page.locator('input[type="file"]').setInputFiles(pngFile("transit-insurance.png"));
		await page.getByRole("button", { name: "Initiate Dispatch" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Delivery Confirmation");
		const documents = page.locator(".ve-selection-summary").nth(1);
		await expect(documents).toContainText("→ E2E School North (Dispatched)");
		await expect(documents).toContainText("→ E2E School South (Dispatched)");
	});

	test("8. Field User confirms delivery with the signed challan", async ({ asRole }) => {
		const page = await asRole("field");
		await openApp(page, `/delivery/confirmation/${prId}`);

		await field(page, "Received By").fill("Principal, E2E School");
		await page.getByRole("button", { name: "Confirm Receipt and Close PR" }).click();
		await expect(toast(page, "upload the signed delivery challan")).toBeVisible();

		await field(page, "Condition").selectOption("Good");
		await page.locator('input[type="file"]').setInputFiles(pngFile("signed-challan.png"));
		await page.getByRole("button", { name: "Confirm Receipt and Close PR" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Completed");
		await expect(page.locator(".ve-vtimeline-item--done")).toHaveCount(8);
		await expect(trailStep(page, "Delivery Confirmation")).toContainText("confirmed delivery");
		await expect(page.locator(".ve-selection-summary").nth(1)).toContainText("(Delivered)");
		// No step is waiting on anyone any more.
		await expect(page.getByRole("heading", { name: "Action" })).toHaveCount(0);
	});
});

test.describe("requisition form validation", () => {
	test.use({ storageState: authFile("field") });

	test("needs a Kit or an Item, and at least one school", async ({ page }) => {
		await openApp(page, "/procurement/new");
		await field(page, "Quantity").fill("1");
		await field(page, "Expected Delivery").fill("2026-12-31");

		await page.getByRole("button", { name: "Submit for Approval" }).click();
		await expect(toast(page, "Select a Kit or an Item for this requisition.")).toBeVisible();

		await field(page, "Kit").selectOption({ label: "E2E Braille Kit" });
		await page.getByRole("button", { name: "Submit for Approval" }).click();
		await expect(toast(page, "Select at least one target school.")).toBeVisible();
		await expect(page).toHaveURL(/\/procurement\/new/);
	});

	test("choosing an Item resets the Kit (never both)", async ({ page }) => {
		await openApp(page, "/procurement/new");
		await field(page, "Kit").selectOption({ label: "E2E Braille Kit" });
		await field(page, "Item").selectOption({ label: "E2E Slate" });
		await expect(field(page, "Kit")).toHaveValue("");
		await expect(page.locator(".ve-field-label", { hasText: "Quantity" })).toContainText("(Units)");
	});

	test("quantity is required", async ({ page }) => {
		await openApp(page, "/procurement/new");
		await page.getByRole("button", { name: "Submit for Approval" }).click();
		expect(await field(page, "Quantity").evaluate((el) => el.validity.valueMissing)).toBe(true);
	});
});

test.describe("rejection", () => {
	test.use({ storageState: authFile("manager") });

	test("a rejected PR is closed and marked ✕ on the trail", async ({ page, browser, asRole }) => {
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

	test("requesting a revision needs remarks and sends the PR back to Vendor Selection", async ({ page, browser, asRole }) => {
		const prId = await createPr(browser, { until: "payment-approval" });
		await openApp(page, `/procurement/${prId}/payment/approval`);

		await page.getByRole("button", { name: "Request Revision" }).click();
		await expect(toast(page, "Add remarks explaining what needs revising.")).toBeVisible();

		await field(page, "Remarks").fill("GST missing on quote");
		await page.getByRole("button", { name: "Request Revision" }).click();

		await expect(page).toHaveURL(/\/status/);
		await expect(pill(page)).toHaveText("Vendor Selection");
		await expect(trailStep(page, "Payment Approval")).toContainText("sent back to Vendor Selection");
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
