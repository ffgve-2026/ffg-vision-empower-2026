// The UI hides actions per role, but the server is the real boundary —
// these call each endpoint directly as the wrong role.
const { request } = require("@playwright/test");
const { test, expect, fixtures, authFile, openApp, callMethod, api } = require("./helpers");

// [role making the call, method, args(fixtures)] — every one must be refused.
// Args are built lazily: fixtures only exist once global setup has run.
const FORBIDDEN = [
	[
		"manager",
		"submit_purchase_requisition",
		(f) => ({ quantity: "1", expected_delivery: "", item_type: f.items.slate }),
	],
	[
		"field",
		"decide_purchase_requisition",
		(f) => ({ pr_id: f.dispatched_pr, decision: "approve" }),
	],
	[
		"finance",
		"add_vendor_quotation",
		(f) => ({ pr_id: f.dispatched_pr, vendor: f.vendors[0], total_amount: "1" }),
	],
	[
		"field",
		"select_vendor",
		(f) => ({ pr_id: f.dispatched_pr, quotation: "x", justification: "x" }),
	],
	["admin", "decide_payment_approval", (f) => ({ pr_id: f.dispatched_pr, decision: "approve" })],
	[
		"admin",
		"record_payment",
		(f) => ({
			pr_id: f.dispatched_pr,
			amount: "1",
			payment_mode: "NEFT",
			payment_date: "2026-10-01",
			utr_number: "x",
			bank_account: "x",
		}),
	],
	[
		"finance",
		"confirm_dispatch",
		(f) => ({
			pr_id: f.dispatched_pr,
			dispatch_date: "2026-10-01",
			transporter: "x",
			lr_docket_no: "x",
		}),
	],
	[
		"admin",
		"confirm_delivery",
		(f) => ({
			pr_id: f.dispatched_pr,
			received_date: "2026-10-01",
			received_by: "x",
			file_url: "x",
		}),
	],
	[
		"field",
		"save_vendor_item_price",
		(f) => ({
			vendor: f.vendors[0],
			item: f.items.slate,
			unit_price: "1",
			effective_date: "2026-10-01",
		}),
	],
	["finance", "delete_vendor_item_price", () => ({ name: "1" })],
	["manager", "get_import_template", () => ({ doctype: "Item" })],
	[
		"field",
		"submit_location_transfer",
		(f) => ({
			item: f.items.slate,
			quantity: "1",
			from_location: f.warehouses[0],
			to_location: f.warehouses[1],
		}),
	],
	["finance", "complete_location_transfer", () => ({ name: "TRF-0000" })],
];

test.describe("server refuses the wrong role", () => {
	for (const [role, method, args] of FORBIDDEN) {
		test(`${role} → ${method} is 403`, async ({ asRole }) => {
			const page = await asRole(role);
			await openApp(page, "/");
			const res = await callMethod(page, api(method), args(fixtures()));
			expect(res.status).toBe(403);
		});
	}

	test("Senior Manager can't report a delivery discrepancy", async ({ asRole }) => {
		const f = fixtures();
		const page = await asRole("manager");
		await openApp(page, "/");
		const res = await callMethod(
			page,
			"vision_empower.api.delivery_discrepancy.report_delivery_discrepancy",
			{
				dc_number: f.challans[0],
				item: f.items.slate,
				received_qty: "0",
			}
		);
		expect(res.status).toBe(403);
	});

	test("a user with no Vision Empower role can't read PRs or reports", async ({ baseURL }) => {
		const ctx = await request.newContext({ baseURL, storageState: authFile("norole") });
		for (const method of [
			"list_purchase_requisitions",
			"get_dashboard_kpis",
			"get_stock_status_report",
		]) {
			const res = await ctx.get(`/api/method/${api(method)}`);
			expect(res.status(), method).toBe(403);
		}
		await ctx.dispose();
	});
});

test.describe("server refuses steps out of order", () => {
	test.use({ storageState: authFile("admin") });

	test("selecting a vendor on a PR that's already dispatched fails", async ({ page }) => {
		const f = fixtures();
		await openApp(page, "/");
		const res = await callMethod(page, api("select_vendor"), {
			pr_id: f.dispatched_pr,
			quotation: "x",
			justification: "x",
		});
		expect(res.status).toBe(417);
		expect(JSON.stringify(res.body)).toContain("can't be performed now");
	});

	test("CSV import refuses non-master doctypes", async ({ page }) => {
		await openApp(page, "/");
		const res = await callMethod(page, api("get_import_template"), { doctype: "User" });
		expect(res.status).toBe(417);
		expect(JSON.stringify(res.body)).toContain("can't be imported here");
	});
});

test.describe("UI hides what a role can't do", () => {
	test("Field User: no New/Import on Item Master, and the create route is blocked", async ({
		asRole,
	}) => {
		const page = await asRole("field");
		await openApp(page, "/master-data/items");
		await expect(page.getByRole("button", { name: "New Item" })).toHaveCount(0);
		await expect(page.getByText("Import CSV")).toHaveCount(0);

		await openApp(page, "/master-data/items/new");
		await expect(page.getByRole("heading", { name: "Not available" })).toBeVisible();
	});

	test("Admin: New/Import visible on Item Master", async ({ asRole }) => {
		const page = await asRole("admin");
		await openApp(page, "/master-data/items");
		await expect(page.getByRole("button", { name: "New Item" })).toBeVisible();
		await expect(page.getByText("Import CSV")).toBeVisible();
	});

	test("Finance: Vendor Prices is read-only", async ({ asRole }) => {
		const page = await asRole("finance");
		await openApp(page, "/master-data/vendor-prices");
		await expect(
			page.locator(".ve-data-table tbody tr", { hasText: "E2E Slate" }).first()
		).toBeVisible();
		await expect(page.getByRole("heading", { name: "Add Price" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
	});

	test("Senior Manager: no Report New Discrepancy button", async ({ asRole }) => {
		const page = await asRole("manager");
		await openApp(page, "/dispatch");
		await expect(page.getByRole("button", { name: "Report New Discrepancy" })).toHaveCount(0);
	});
});
