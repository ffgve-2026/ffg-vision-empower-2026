// Uploads on PR steps: real PDFs, opening them from the audit trail (and
// who may), and the audit trail's own "+ Attach Document".
const { request } = require("@playwright/test");
const { test, expect, authFile, field, openApp, toast, createPr, pngFile } = require("./helpers");

// A minimal but structurally valid one-page PDF (correct xref offsets) —
// Frappe parses uploaded PDFs, so a fake one is rejected.
function pdfFile(name, text = `E2E document ${name}`) {
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
		null, // content stream, filled below
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	];
	const stream = `BT /F1 12 Tf 20 100 Td (${text}) Tj ET`;
	objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;

	let body = "%PDF-1.4\n";
	const offsets = [];
	objects.forEach((obj, i) => {
		offsets.push(body.length);
		body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
	});
	const xrefAt = body.length;
	body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	body += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
	body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
	return { name, mimeType: "application/pdf", buffer: Buffer.from(body, "latin1") };
}

const trailStep = (page, label) =>
	page.locator(".ve-vtimeline-item", { has: page.locator(".ve-vtimeline-label", { hasText: new RegExp(`^${label}$`) }) });

// Click an attachment on the audit trail; returns the URL it opened.
// (Headless Chromium turns a PDF tab into a download, so capture the URL
// window.open receives; the file itself is fetched separately below.)
async function openAttachment(page, attachment) {
	await page.evaluate(() => {
		window.__opened = [];
		window.open = (url) => window.__opened.push(url);
	});
	await attachment.click();
	const opened = await page.evaluate(() => window.__opened);
	expect(opened).toHaveLength(1);
	return new URL(opened[0], page.url()).href;
}

test.describe("PDF uploads on workflow steps", () => {
	test("a real PDF invoice is accepted, shown on the trail, and opens as a PDF", async ({ browser, asRole, baseURL }) => {
		const prId = await createPr(browser, { until: "payment-approval" });

		const finance = await asRole("finance");
		await openApp(finance, `/procurement/${prId}/payment/approval`);
		await field(finance, "Invoice Number").fill("INV-PDF-1");
		await finance.locator('input[type="file"]').setInputFiles(pdfFile("vendor-invoice.pdf"));
		await expect(finance.locator(".ve-invoice-file-name")).toHaveText("vendor-invoice.pdf");
		await finance.getByRole("button", { name: "Approve Payment" }).click();
		await expect(finance).toHaveURL(/\/status/);

		const attachment = trailStep(finance, "Payment Approval").locator(".ve-vtimeline-attachment");
		await expect(attachment).toHaveCount(1);
		await expect(attachment).toContainText("vendor-invoice");
		await expect(attachment).toContainText(".pdf");

		// Clicking it opens the private file.
		const fileUrl = await openAttachment(finance, attachment);
		expect(fileUrl).toMatch(/\/private\/files\/vendor-invoice.*\.pdf/);
		const path = new URL(fileUrl).pathname;

		// Every Vision Empower role can read it (they can read the PR)…
		for (const role of ["field", "manager", "admin", "finance"]) {
			const ctx = await request.newContext({ baseURL, storageState: authFile(role) });
			const res = await ctx.get(path);
			expect(res.status(), role).toBe(200);
			expect((await res.body()).subarray(0, 5).toString(), role).toBe("%PDF-");
			await ctx.dispose();
		}

		// …but not a user without a role, nor someone logged out.
		for (const storageState of [authFile("norole"), { cookies: [], origins: [] }]) {
			const ctx = await request.newContext({ baseURL, storageState });
			const res = await ctx.get(path);
			expect(res.status()).not.toBe(200);
			expect((await res.body()).subarray(0, 5).toString()).not.toBe("%PDF-");
			await ctx.dispose();
		}
	});

	test("PDFs are accepted at quotation, dispatch and delivery too", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "quotations" });

		const admin = await asRole("admin");
		await openApp(admin, `/procurement/${prId}/vendor/quotations`);
		await field(admin, "Vendor").selectOption({ label: "E2E Vendor Beta" });
		await field(admin, "Total Amount").fill("800");
		await admin.locator('input[type="file"]').setInputFiles(pdfFile("quotation.pdf"));
		await admin.getByRole("button", { name: "Add Quotation" }).click();
		await expect(toast(admin, "Quotation added.")).toBeVisible();
		// The quote ref links to the uploaded document.
		await expect(admin.locator(".ve-quotation-table a.ve-link")).toHaveAttribute("href", /\/private\/files\/quotation.*\.pdf/);

		const dispatchPr = await createPr(browser, { until: "dispatch" });
		await openApp(admin, `/dispatch/initiation/${dispatchPr}`);
		await field(admin, "Transporter").fill("E2E Logistics");
		await field(admin, "LR / Docket Number").fill("LR-PDF");
		await admin.locator('input[type="file"]').setInputFiles(pdfFile("transit-insurance.pdf"));
		await admin.getByRole("button", { name: "Initiate Dispatch" }).click();
		await expect(admin).toHaveURL(/\/status/);
		await expect(trailStep(admin, "Dispatch").locator(".ve-vtimeline-attachment")).toContainText("transit-insurance");

		const field_ = await asRole("field");
		await openApp(field_, `/delivery/confirmation/${dispatchPr}`);
		await field(field_, "Received By").fill("Principal");
		await field_.locator('input[type="file"]').setInputFiles(pdfFile("signed-challan.pdf"));
		await field_.getByRole("button", { name: "Confirm Receipt and Close PR" }).click();
		await expect(field_).toHaveURL(/\/status/);
		await expect(trailStep(field_, "Delivery Confirmation").locator(".ve-vtimeline-attachment")).toContainText("signed-challan");
	});

	test("a corrupt PDF is rejected and the step doesn't advance", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "payment-approval" });
		const finance = await asRole("finance");
		await openApp(finance, `/procurement/${prId}/payment/approval`);
		await field(finance, "Invoice Number").fill("INV-BAD");
		await finance.locator('input[type="file"]').setInputFiles({
			name: "broken.pdf",
			mimeType: "application/pdf",
			buffer: Buffer.from("%PDF-1.4 this is not really a pdf"),
		});
		await finance.getByRole("button", { name: "Approve Payment" }).click();
		await expect(toast(finance, "Could not record the payment decision.")).toBeVisible();
		await expect(finance).toHaveURL(/\/payment\/approval/);

		await openApp(finance, `/procurement/${prId}/status`);
		await expect(finance.locator(".ve-selection-summary .ve-pill").first()).toHaveText("Payment Approval");
	});

	test("the invoice picker refuses non-document file types", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "payment-approval" });
		const finance = await asRole("finance");
		await openApp(finance, `/procurement/${prId}/payment/approval`);
		await finance.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
		await expect(toast(finance, "Please upload a PDF, JPG or PNG invoice.")).toBeVisible();
		await expect(finance.locator(".ve-invoice-file-name")).toHaveCount(0);
	});
});

test.describe("audit trail: + Attach Document", () => {
	test("any role can attach a document to a reached step; it's logged and opens", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "quotations" });
		const manager = await asRole("manager");
		await openApp(manager, `/procurement/${prId}/status`);

		// Only reached steps offer the button.
		await expect(trailStep(manager, "Approval").getByRole("button", { name: "+ Attach Document" })).toBeVisible();
		await expect(trailStep(manager, "Dispatch").getByRole("button", { name: "+ Attach Document" })).toHaveCount(0);

		await manager.locator("#pr-upload-approval").setInputFiles(pdfFile("budget-approval-note.pdf"));
		await expect(toast(manager, '"budget-approval-note')).toBeVisible();

		const approval = trailStep(manager, "Approval");
		await expect(approval).toContainText("attached a document");
		const attachment = approval.locator(".ve-vtimeline-attachment");
		await expect(attachment).toContainText("budget-approval-note");
		expect(await openAttachment(manager, attachment)).toMatch(/\/private\/files\/budget-approval-note.*\.pdf/);

		// Still there after a reload (persisted, not session-only).
		await manager.reload();
		await expect(trailStep(manager, "Approval").locator(".ve-vtimeline-attachment")).toContainText("budget-approval-note");

		// Frappe stores byte-identical uploads once; each still shows the
		// name it was uploaded under.
		const same = pdfFile("minutes-copy-a.pdf", "identical bytes");
		await manager.locator("#pr-upload-quotations").setInputFiles(same);
		await expect(toast(manager, '"minutes-copy-a')).toBeVisible();
		await manager.locator("#pr-upload-quotations").setInputFiles({ ...same, name: "minutes-copy-b.pdf" });
		const quotes = trailStep(manager, "Quotation Collection").locator(".ve-vtimeline-attachment");
		await expect(quotes).toHaveCount(2);
		await expect(quotes.nth(0)).toContainText("minutes-copy-a.pdf");
		await expect(quotes.nth(1)).toContainText("minutes-copy-b.pdf");

		// Images work too.
		await manager.locator("#pr-upload-requisition").setInputFiles(pngFile("site-photo.png"));
		await expect(trailStep(manager, "Requisition").locator(".ve-vtimeline-attachment")).toContainText("site-photo");
	});

	test("the server refuses attaching to an unknown stage", async ({ browser, asRole }) => {
		const prId = await createPr(browser, { until: "approval" });
		const page = await asRole("field");
		await openApp(page, "/");
		const res = await page.evaluate(async (prId) => {
			const r = await fetch("/api/method/vision_empower.vision_empower.api.add_pr_attachment", {
				method: "POST",
				headers: { "X-Frappe-CSRF-Token": window.frappe.csrf_token, "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({ pr_id: prId, file_url: "/private/files/x.pdf", stage: "not-a-stage" }),
			});
			return r.status;
		}, prId);
		expect(res).toBe(417);
	});
});
