// Workflow rules from sign-off testing: money can't exceed what was
// approved, quantities stay consistent from kit to challan to receipt,
// requisitions only change through the workflow, sensitive vendor data is
// role-restricted, and approvals have rework, reasons and the fund budget.
const {
	test,
	expect,
	fixtures,
	authFile,
	field,
	openApp,
	toast,
	callMethod,
	api,
	createPr,
	uploadAs,
	pngFile,
	today,
	deliveryDate,
} = require("./helpers");

const status = async (page, prId) =>
	(await callMethod(page, api("get_purchase_requisition_status"), { pr_id: prId })).body.message;

const errorText = (res) => JSON.stringify(res.body);

test.describe("money", () => {
	test("a payment can't exceed the approved invoice", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "payment" });
		const finance = await asRole("finance");
		await openApp(finance, "/");
		const invoice = (await status(finance, prId)).vendor_invoice;

		const res = await callMethod(finance, api("record_payment"), {
			pr_id: prId,
			amount: String(Number(invoice.amount) + 500),
			payment_mode: "NEFT",
			payment_date: today(),
			utr_number: "E2E-OVER",
			bank_account: "E2E Bank",
		});
		expect(res.status).toBe(417);
		expect(errorText(res)).toContain("more than the approved invoice amount");
		expect((await status(finance, prId)).stage).toBe("payment");
	});

	test("an invoice above the PO needs a confirmed reason to approve", async ({
		browser,
		asRole,
	}) => {
		const prId = await createPr(browser, { until: "payment-approval" });
		const finance = await asRole("finance");
		await openApp(finance, "/");
		const po = (await status(finance, prId)).purchase_order;
		const file_url = await uploadAs(finance, "over-invoice.png");
		const args = {
			pr_id: prId,
			decision: "approve",
			invoice_number: "E2E-OVER-INV",
			amount: String(po.total_amount + 200),
			file_url,
		};

		const silent = await callMethod(finance, api("decide_payment_approval"), args);
		expect(silent.status).toBe(417);
		expect(errorText(silent)).toContain("above the PO total");

		const noReason = await callMethod(finance, api("decide_payment_approval"), {
			...args,
			accept_discrepancy: "1",
		});
		expect(noReason.status).toBe(417);

		const accepted = await callMethod(finance, api("decide_payment_approval"), {
			...args,
			accept_discrepancy: "1",
			remarks: "Freight added by vendor, agreed by phone",
		});
		expect(accepted.status).toBe(200);
		const after = await status(finance, prId);
		expect(after.vendor_invoice.match_status).toBe("Discrepancy");
		expect(after.activity.at(-1).remarks).toContain("above PO accepted: Freight added");
	});

	test("the invoice page asks for confirmation when the amount is above the PO", async ({
		browser,
		asRole,
	}) => {
		const prId = await createPr(browser, { until: "payment-approval" });
		const finance = await asRole("finance");
		await openApp(finance, `/procurement/${prId}/payment/approval`);
		const po = Number(await field(finance, "Invoice Amount").inputValue());
		await field(finance, "Invoice Number").fill("E2E-UI-OVER");
		await field(finance, "Invoice Amount").fill(String(po + 100));
		await expect(finance.locator(".ve-form-warning")).toContainText("₹100 above the PO");
		await finance.locator('input[type="file"]').setInputFiles(pngFile("inv.png"));
		await finance.getByRole("button", { name: "Approve Payment" }).click();
		await expect(toast(finance, "The invoice is above the PO")).toBeVisible();
	});

	test("PO lines use the chosen vendor's quoted prices and add up to the PO", async ({
		browser,
		asRole,
	}) => {
		const f = fixtures();
		const prId = await createPr(browser, { until: "quotations", kitQty: "2" });
		const admin = await asRole("admin");
		await openApp(admin, "/");

		// Vendor Beta has no price list — its quote must give line prices.
		const unpriced = await callMethod(admin, api("add_vendor_quotation"), {
			pr_id: prId,
			vendor: f.vendors[1],
		});
		expect(unpriced.status).toBe(417);
		expect(errorText(unpriced)).toContain("unit price for E2E Slate");

		const mismatch = await callMethod(admin, api("add_vendor_quotation"), {
			pr_id: prId,
			vendor: f.vendors[1],
			line_prices: JSON.stringify({ [f.items.slate]: 100, [f.items.stylus]: 25 }),
			total_amount: "999",
		});
		expect(mismatch.status).toBe(417);

		const quote = (
			await callMethod(admin, api("add_vendor_quotation"), {
				pr_id: prId,
				vendor: f.vendors[1],
				line_prices: JSON.stringify({ [f.items.slate]: 100, [f.items.stylus]: 25 }),
			})
		).body.message.quotation;
		// 2 kits = 2 slates × 100 + 4 styluses × 25.
		expect(quote.total_amount).toBe(300);

		await callMethod(admin, api("close_quotation_collection"), { pr_id: prId });
		await callMethod(admin, api("select_vendor"), {
			pr_id: prId,
			quotation: quote.name,
			justification: "e2e",
		});
		const poName = (await status(admin, prId)).purchase_order.name;
		const po = (
			await callMethod(admin, "frappe.client.get", {
				doctype: "VE Purchase Order",
				name: poName,
			})
		).body.message;
		const prices = Object.fromEntries(
			po.line_items.map((l) => [l.item_id, Number(l.unit_price)])
		);
		expect(prices).toEqual({ [f.items.slate]: 100, [f.items.stylus]: 25 });
		const sum = po.line_items.reduce((t, l) => t + l.line_total, 0);
		expect(sum).toBe(po.total_amount);
	});
});

test.describe("quantities from kit to challan to receipt", () => {
	test("kits split across schools carry matching item quantities", async ({
		browser,
		asRole,
	}) => {
		const f = fixtures();
		const prId = await createPr(browser, {
			until: "dispatch",
			kitQty: "3",
			schools: f.schools,
		});
		const admin = await asRole("admin");
		await openApp(admin, "/");
		const res = await callMethod(admin, api("confirm_dispatch"), {
			pr_id: prId,
			dispatch_date: today(),
			transporter: "E2E",
			lr_docket_no: "E2E-SPLIT",
		});
		expect(res.status).toBe(200);

		// 3 kits → 2 + 1; each kit is 1 slate + 2 styluses.
		const dcs = (await status(admin, prId)).dispatches;
		const byKits = Object.fromEntries(
			dcs.map((dc) => [
				dc.kit_qty,
				Object.fromEntries(dc.items.map((i) => [i.item_name, i.qty])),
			])
		);
		expect(byKits).toEqual({
			2: { "E2E Slate": 2, "E2E Stylus": 4 },
			1: { "E2E Slate": 1, "E2E Stylus": 2 },
		});
	});

	test("per-school quantities must add up and name target schools", async ({
		browser,
		asRole,
	}) => {
		const f = fixtures();
		const prId = await createPr(browser, {
			until: "dispatch",
			kitQty: "4",
			schools: f.schools,
		});
		const admin = await asRole("admin");
		await openApp(admin, "/");
		const dispatch = (school_kits) =>
			callMethod(admin, api("confirm_dispatch"), {
				pr_id: prId,
				dispatch_date: today(),
				transporter: "E2E",
				lr_docket_no: "E2E-PER",
				school_kits: JSON.stringify(school_kits),
			});

		const short = await dispatch({ [f.schools[0]]: 1, [f.schools[1]]: 1 });
		expect(short.status).toBe(417);
		expect(errorText(short)).toContain("add up to 2, but the request is for 4");

		const stranger = await dispatch({ "NOT-A-SCHOOL": 4 });
		expect(stranger.status).toBe(417);

		// All 4 to the first school: no challan for the second.
		const ok = await dispatch({ [f.schools[0]]: 4, [f.schools[1]]: 0 });
		expect(ok.status).toBe(200);
		const dcs = (await status(admin, prId)).dispatches;
		expect(dcs.map((dc) => [dc.school, dc.kit_qty])).toEqual([[f.schools[0], 4]]);
	});

	test("delivery is confirmed per school; a later shortage shows on the report until resolved", async ({
		browser,
		asRole,
	}) => {
		const f = fixtures();
		const prId = await createPr(browser, {
			until: "delivery",
			kitQty: "2",
			schools: f.schools,
		});
		const field_ = await asRole("field");
		await openApp(field_, "/");
		const [first, second] = (await status(field_, prId)).dispatches.map((dc) => dc.name);
		const file_url = await uploadAs(field_, "signed.png");
		const confirm = (args) =>
			callMethod(field_, api("confirm_delivery"), {
				pr_id: prId,
				received_date: today(),
				received_by: "E2E Principal",
				file_url,
				...args,
			});

		// Two challans are waiting, so one confirmation can't cover both.
		const ambiguous = await confirm({});
		expect(ambiguous.status).toBe(417);

		const one = await confirm({ challan: first });
		expect(one.status).toBe(200);
		expect(one.body.message.remaining).toBe(1);
		let pr = await status(field_, prId);
		expect(pr.stage).toBe("delivery");
		expect(pr.dispatches.find((d) => d.name === first).status).toBe("Delivered");
		expect(pr.dispatches.find((d) => d.name === second).status).toBe("Dispatched");

		// A shortage reported afterwards corrects the "Good" challan...
		const dc = pr.dispatches.find((d) => d.name === first);
		const stylus = dc.items.find((i) => i.item === f.items.stylus);
		const reported = await callMethod(
			field_,
			"vision_empower.api.delivery_discrepancy.report_delivery_discrepancy",
			{ dc_number: first, item: f.items.stylus, received_qty: String(stylus.qty - 1) }
		);
		expect(reported.status).toBe(200);
		pr = await status(field_, prId);
		expect(pr.dispatches.find((d) => d.name === first).condition).toBe("Shortage");

		// ...and the dispatch report doesn't count it as delivered while open.
		const admin = await asRole("admin");
		await openApp(admin, "/reports/dispatch-status");
		const row = admin.locator(".ve-data-table tbody tr", { hasText: first });
		await expect(row).toContainText("Shortage open");
		await expect(row).toContainText("1 unit(s) short");

		const resolved = await callMethod(
			admin,
			"vision_empower.api.delivery_discrepancy.resolve_delivery_discrepancy",
			{ name: reported.body.message.name, resolution: "Replacement sent" }
		);
		expect(resolved.status).toBe(200);
		await admin.reload();
		await expect(row).toContainText("Confirmed");

		// The last school closes the PR.
		const last = await confirm({ challan: second });
		expect(last.status).toBe(200);
		expect(last.body.message.remaining).toBe(0);
		expect((await status(field_, prId)).stage).toBe("completed");
	});
});

test.describe("requisitions change only through the workflow", () => {
	test("a Field User can't edit a requisition directly through the API", async ({
		browser,
		asRole,
	}) => {
		const prId = await createPr(browser, { until: "approval" });
		const field_ = await asRole("field");
		await openApp(field_, "/");
		for (const [fieldname, value] of [
			["workflow_stage", "Completed"],
			["approved_by", "e2e-field@visionempower.test"],
			["status", "Approved"],
		]) {
			const res = await callMethod(field_, "frappe.client.set_value", {
				doctype: "Procurement Requisition",
				name: prId,
				fieldname,
				value,
			});
			expect(res.status).toBe(403);
		}
		const created = await callMethod(field_, "frappe.client.insert", {
			doc: JSON.stringify({
				doctype: "Procurement Requisition",
				workflow_stage: "Completed",
				line_items: [
					{
						pr_line_id: 1,
						item_id: fixtures().items.slate,
						qty: 1,
						estimated_unit_cost: "1",
					},
				],
			}),
		});
		expect(created.status).toBe(403);
		expect((await status(field_, prId)).stage).toBe("approval");
	});

	test("fund and project are required", async ({ asRole }) => {
		const f = fixtures();
		const field_ = await asRole("field");
		await openApp(field_, "/");
		const base = {
			kit_type: f.kit,
			quantity: "1",
			expected_delivery: deliveryDate(),
			target_schools: JSON.stringify([f.schools[0]]),
		};
		const noFund = await callMethod(field_, api("submit_purchase_requisition"), {
			...base,
			project: f.project,
		});
		expect(noFund.status).toBe(417);
		expect(errorText(noFund)).toContain("Select the fund");
		const noProject = await callMethod(field_, api("submit_purchase_requisition"), {
			...base,
			fund: f.fund,
		});
		expect(noProject.status).toBe(417);
		expect(errorText(noProject)).toContain("Select the project");
	});
});

test.describe("approval", () => {
	test("rejecting needs a reason", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "approval" });
		const manager = await asRole("manager");
		await openApp(manager, `/procurement/${prId}/approval`);
		await manager.getByRole("button", { name: "Reject" }).click();
		await expect(toast(manager, "Give a reason for rejecting")).toBeVisible();

		const res = await callMethod(manager, api("decide_purchase_requisition"), {
			pr_id: prId,
			decision: "reject",
		});
		expect(res.status).toBe(417);
		expect((await status(manager, prId)).stage).toBe("approval");
	});

	test("send back for rework, then the requester revises and resubmits", async ({
		browser,
		asRole,
	}) => {
		const prId = await createPr(browser, { until: "approval", kitQty: "2" });
		const manager = await asRole("manager");
		await openApp(manager, `/procurement/${prId}/approval`);
		await manager.getByRole("button", { name: "Send Back for Rework" }).click();
		await expect(toast(manager, "Give a reason")).toBeVisible();
		await field(manager, "Remarks").fill("Please order 3 kits, not 2");
		await manager.getByRole("button", { name: "Send Back for Rework" }).click();
		await expect(manager).toHaveURL(/\/status/);
		await expect(manager.locator(".ve-vtimeline")).toContainText("sent it back for rework");

		// Nobody else can act on it at Approval meanwhile.
		const approve = await callMethod(manager, api("decide_purchase_requisition"), {
			pr_id: prId,
			decision: "approve",
		});
		expect(approve.status).toBe(417);

		const field_ = await asRole("field");
		await openApp(field_, `/procurement/${prId}/status`);
		await field_.getByRole("button", { name: /Go to .* →/ }).click();
		await expect(field_).toHaveURL(new RegExp(`/procurement/${prId}/requisition`));
		await expect(field_.locator(".ve-rework-note")).toContainText("Please order 3 kits");
		await expect(field(field_, "Quantity")).toHaveValue("2");
		await expect(field(field_, "Project")).toHaveValue(fixtures().project);
		await field(field_, "Quantity").fill("3");
		await field_.getByRole("button", { name: "Resubmit for Approval" }).click();

		await expect(field_).toHaveURL(/\/status/);
		const pr = await status(field_, prId);
		expect(pr.stage).toBe("approval");
		expect(pr.record.request_qty).toBe(3);
		expect(pr.activity.map((a) => a.action)).toEqual(
			expect.arrayContaining(["sent_back", "resubmitted"])
		);
	});

	test("the approval page shows the fund's budget", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "approval" });
		const manager = await asRole("manager");
		await openApp(manager, `/procurement/${prId}/approval`);
		const budget = manager.locator(".ve-budget");
		await expect(budget).toContainText("Fund Budget — E2E Fund Seed");
		for (const label of ["Sanctioned", "Committed (other requests)", "Available"])
			await expect(
				budget.locator(".ve-detail-field-label", { hasText: label }).first()
			).toBeVisible();
		const b = (await status(manager, prId)).budget;
		expect(b.sanctioned).toBe(100000);
		expect(b.available).toBe(b.sanctioned - b.committed);
	});
});

test.describe("vendor bank details and PAN", () => {
	test.use({ storageState: authFile("admin") });

	test("hidden from Field Users and Senior Managers, visible to Admin and Finance", async ({
		page,
		asRole,
	}) => {
		const f = fixtures();
		await openApp(page, "/");
		const set = await callMethod(page, "frappe.client.set_value", {
			doctype: "Vendor",
			name: f.vendors[0],
			fieldname: JSON.stringify({ pan: "ABCDE1234F", bank_account_number: "000111222" }),
		});
		expect(set.status).toBe(200);

		for (const role of ["field", "manager"]) {
			const p = await asRole(role);
			await openApp(p, `/master-data/vendors/${f.vendors[0]}`);
			await expect(p.locator(".ve-view")).toContainText("E2E Vendor Alpha");
			await expect(p.getByText("Bank & Settlement Details")).toHaveCount(0);
			await expect(p.locator(".ve-view")).not.toContainText("ABCDE1234F");

			const doc = (
				await callMethod(p, "frappe.client.get", { doctype: "Vendor", name: f.vendors[0] })
			).body.message;
			expect(doc.pan).toBeFalsy();
			expect(doc.bank_account_number).toBeFalsy();
			const viaApi = (
				await callMethod(p, "vision_empower.api.vendor.get_vendor", { name: f.vendors[0] })
			).body.message;
			expect(viaApi).not.toHaveProperty("pan");
			const exported = (await callMethod(p, api("export_csv_rows"), { doctype: "Vendor" }))
				.body.message;
			expect(exported.columns.join(",")).not.toMatch(/PAN|Bank|IFSC/i);
			expect(JSON.stringify(exported.rows)).not.toContain("000111222");
		}

		const finance = await asRole("finance");
		await openApp(finance, `/master-data/vendors/${f.vendors[0]}`);
		await expect(finance.getByText("Bank & Settlement Details")).toBeVisible();
		await expect(finance.locator(".ve-view")).toContainText("ABCDE1234F");
	});
});
