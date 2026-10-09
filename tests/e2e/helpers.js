const fs = require("fs");
const path = require("path");
const { test: base, expect } = require("@playwright/test");
const { STATE_DIR, authFile } = require("./server");

const fixtures = () => JSON.parse(fs.readFileSync(path.join(STATE_DIR, "fixtures.json"), "utf-8"));

// 1x1 PNG — a real image, since Frappe validates uploaded file contents.
const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
	"base64"
);
const pngFile = (name) => ({ name, mimeType: "image/png", buffer: PNG });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The input/select/textarea inside the .ve-field whose label starts with
// `label` (labels aren't associated with inputs via for=, so getByLabel
// doesn't work in this app).
function field(scope, label) {
	return scope
		.locator(".ve-field")
		.filter({ has: scope.locator(".ve-field-label", { hasText: new RegExp(`^\\s*${escapeRegex(label)}`) }) })
		.locator("input:not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea")
		.first();
}

// Waits for whatever view the router rendered (not every view has a
// .ve-view root — e.g. Forbidden is a bare widget).
async function openApp(page, route = "/") {
	await page.goto(`/app/vision-empower#${route}`);
	await expect(page.locator(".ve-content > *").first()).toBeVisible();
}

const toast = (page, text) => page.locator(".ve-toast", { hasText: text });

// Calls a whitelisted method directly with the page's session — used to
// prove the server rejects what the UI merely hides.
async function callMethod(page, method, args = {}) {
	return page.evaluate(
		async ({ method, args }) => {
			const res = await fetch(`/api/method/${method}`, {
				method: "POST",
				headers: {
					"X-Frappe-CSRF-Token": window.frappe.csrf_token,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams(args),
			});
			let body = null;
			try {
				body = await res.json();
			} catch (e) {}
			return { status: res.status, body };
		},
		{ method, args }
	);
}

const api = (name) => `vision_empower.vision_empower.api.${name}`;

// A page logged in as another role, for multi-role flows inside one test.
async function pageAs(browser, role) {
	const context = await browser.newContext({ storageState: authFile(role) });
	return context.newPage();
}

const today = () => new Date().toISOString().slice(0, 10);

// Returns the PR id from a /procurement/<id>/status URL.
const prIdFromUrl = (url) => decodeURIComponent(url.match(/procurement\/([^/]+)\/status/)[1]);

// Select the first <option> whose text contains `text` (option labels here
// often combine an ID and a name).
async function selectByText(select, text) {
	const value = await select.evaluate((el, t) => {
		const option = [...el.options].find((o) => o.textContent.includes(t));
		return option ? option.value : null;
	}, text);
	if (value === null) throw new Error(`No option containing "${text}"`);
	await select.selectOption(value);
}

// Uploads a small PNG as the page's user and returns its file_url.
async function uploadAs(page, name = "e2e.png") {
	return page.evaluate(
		async ({ name, b64 }) => {
			const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
			const form = new FormData();
			form.append("file", new Blob([bytes], { type: "image/png" }), name);
			form.append("is_private", "1");
			const res = await fetch("/api/method/upload_file", {
				method: "POST",
				headers: { "X-Frappe-CSRF-Token": window.frappe.csrf_token },
				body: form,
			});
			return (await res.json()).message.file_url;
		},
		{ name, b64: PNG.toString("base64") }
	);
}

// Steps in order; createPr(..., { until }) walks a fresh PR through every
// step before `until` using the real role users, via the API.
const STEPS = ["approval", "quotations", "vendor-selection", "payment-approval", "payment", "dispatch", "delivery", "completed"];

async function createPr(browser, { until = "approval", kitQty = "2" } = {}) {
	const f = fixtures();
	const pages = {};
	const as = async (role) => {
		if (!pages[role]) {
			pages[role] = await pageAs(browser, role);
			await openApp(pages[role], "/");
		}
		return pages[role];
	};
	const call = async (role, method, args) => {
		const res = await callMethod(await as(role), api(method), args);
		if (res.status !== 200) throw new Error(`${method} as ${role} failed: ${res.status} ${JSON.stringify(res.body)}`);
		return res.body.message;
	};
	const reached = (stage) => STEPS.indexOf(until) > STEPS.indexOf(stage);

	const pr = (
		await call("field", "submit_purchase_requisition", {
			kit_type: f.kit,
			quantity: kitQty,
			expected_delivery: "2026-12-31",
			target_schools: JSON.stringify([f.schools[0]]),
		})
	).pr_id;
	if (reached("approval")) await call("manager", "decide_purchase_requisition", { pr_id: pr, decision: "approve" });
	if (reached("quotations")) {
		const q = await call("admin", "add_vendor_quotation", { pr_id: pr, vendor: f.vendors[0], total_amount: "900" });
		await call("admin", "close_quotation_collection", { pr_id: pr });
		if (reached("vendor-selection"))
			await call("admin", "select_vendor", { pr_id: pr, quotation: q.quotation.name, justification: "e2e" });
	}
	if (reached("payment-approval")) {
		const fileUrl = await uploadAs(await as("finance"), "e2e-invoice.png");
		await call("finance", "decide_payment_approval", { pr_id: pr, decision: "approve", invoice_number: "E2E-INV", file_url: fileUrl });
	}
	if (reached("payment"))
		await call("finance", "record_payment", {
			pr_id: pr, amount: "900", payment_mode: "NEFT", payment_date: today(), utr_number: "E2E-UTR", bank_account: "E2E Bank",
		});
	if (reached("dispatch"))
		await call("admin", "confirm_dispatch", { pr_id: pr, dispatch_date: today(), transporter: "E2E", lr_docket_no: "E2E-LR" });

	for (const page of Object.values(pages)) await page.context().close();
	return pr;
}

const test = base.extend({
	// asRole("finance") → a page logged in as that role; its context is
	// closed when the test ends.
	asRole: async ({ browser }, use) => {
		const contexts = [];
		await use(async (role) => {
			const context = await browser.newContext({ storageState: authFile(role) });
			contexts.push(context);
			return context.newPage();
		});
		for (const context of contexts) await context.close();
	},
});

module.exports = {
	test,
	expect,
	fixtures,
	authFile,
	field,
	openApp,
	toast,
	callMethod,
	api,
	pageAs,
	pngFile,
	today,
	prIdFromUrl,
	selectByText,
	uploadAs,
	createPr,
};
