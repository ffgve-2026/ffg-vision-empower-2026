// Export CSV on every list: Master Data exports every record in the import
// template's columns (so a file round-trips through Import CSV); the other
// lists export what they show. Cells Excel would run as formulas are escaped.
const fs = require("fs");
const {
	test,
	expect,
	fixtures,
	authFile,
	openApp,
	toast,
	callMethod,
	createPr,
} = require("./helpers");

// Minimal RFC 4180 parser: quoted cells may hold commas, quotes, newlines.
function parseCsv(text) {
	const rows = [];
	let row = [];
	let cell = "";
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (c === '"') quoted = false;
			else cell += c;
		} else if (c === '"') quoted = true;
		else if (c === ",") {
			row.push(cell);
			cell = "";
		} else if (c === "\n") {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = "";
		} else cell += c;
	}
	row.push(cell);
	rows.push(row);
	return rows.filter((r) => r.some((v) => v !== ""));
}

// Clicks Export CSV and returns { name, text, header, rows: [{col: value}] }.
async function exportCsv(page, scope = page) {
	const [download] = await Promise.all([
		page.waitForEvent("download"),
		scope.getByRole("button", { name: "Export CSV" }).click(),
	]);
	const raw = fs.readFileSync(await download.path(), "utf-8");
	expect(raw.charCodeAt(0)).toBe(0xfeff);
	const text = raw.slice(1);
	const [header, ...body] = parseCsv(text);
	const rows = body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
	return { name: download.suggestedFilename(), text, header, rows };
}

const tableRows = (page) => page.locator(".ve-data-table tbody tr:has(td:nth-child(2))");

test.describe("Master Data export", () => {
	test.use({ storageState: authFile("admin") });

	test("Vendors: every vendor, in the import template's columns plus ID", async ({ page }) => {
		const { vendors } = fixtures();
		await openApp(page, "/master-data/vendors");
		await expect(tableRows(page).first()).toBeVisible();
		const { name, header, rows } = await exportCsv(page);
		expect(name).toMatch(/^vendor-\d{4}-\d{2}-\d{2}\.csv$/);
		expect(header.slice(0, 2)).toEqual(["ID", "Vendor Name"]);
		expect(rows).toHaveLength(await tableRows(page).count());
		for (const id of vendors) expect(rows.map((r) => r.ID)).toContain(id);
		expect(rows.find((r) => r["Vendor Name"] === "E2E Vendor Alpha").Active).toBe("Yes");
	});

	test("Kits: Kit Items in the importer's 'Item:qty; Item:qty' format, and the file re-imports", async ({
		page,
	}) => {
		await openApp(page, "/master-data/kits");
		const { header, rows } = await exportCsv(page);
		const kit = rows.find((r) => r["Kit Name"].startsWith("E2E"));
		expect(kit["Kit Items"]).toBe("E2E Slate:1; E2E Stylus:2");

		// Edit the exported row into a new kit and import it back.
		const copy = { ...kit, "Kit Name": "E2E Re-imported Kit", "Kit Code": "E2E-REIMPORT" };
		const line = header.map((h) => `"${String(copy[h] ?? "").replace(/"/g, '""')}"`).join(",");
		await page.locator("#ve-import-kit").setInputFiles({
			name: "kits.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(`${header.join(",")}\n${line}\n`),
		});
		await expect(toast(page, "Imported 1 record(s). Ignored columns: ID.")).toBeVisible();
		await expect(
			page.locator(".ve-data-table", { hasText: "E2E Re-imported Kit" })
		).toBeVisible();
	});

	test("cells Excel would run as formulas are escaped, and the import unescapes them", async ({
		page,
	}) => {
		await openApp(page, "/master-data/vendors");
		const created = await callMethod(page, "frappe.client.insert", {
			doc: JSON.stringify({
				doctype: "Vendor",
				vendor_name: "E2E Formula Vendor",
				active: 1,
				phone: "+91 98765 43210",
				contact_person: '=HYPERLINK("http://example.com")',
			}),
		});
		expect(created.status).toBe(200);
		await page.reload();
		await expect(tableRows(page).first()).toBeVisible();

		const { text, header, rows } = await exportCsv(page);
		const vendor = rows.find((r) => r["Vendor Name"] === "E2E Formula Vendor");
		expect(vendor.Phone).toBe("'+91 98765 43210");
		expect(vendor["Contact Person"]).toBe(`'=HYPERLINK("http://example.com")`);
		expect(text).not.toMatch(/(^|,)[=+@]/m);

		const copy = { ...vendor, "Vendor Name": "E2E Formula Vendor Copy" };
		const line = header.map((h) => `"${String(copy[h] ?? "").replace(/"/g, '""')}"`).join(",");
		await page.locator("#ve-import-vendor").setInputFiles({
			name: "vendors.csv",
			mimeType: "text/csv",
			buffer: Buffer.from(`${header.join(",")}\n${line}\n`),
		});
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();
		const stored = await callMethod(page, "frappe.client.get_value", {
			doctype: "Vendor",
			filters: JSON.stringify({ vendor_name: "E2E Formula Vendor Copy" }),
			fieldname: JSON.stringify(["phone", "contact_person"]),
		});
		expect(stored.body.message).toEqual({
			phone: "+91 98765 43210",
			contact_person: '=HYPERLINK("http://example.com")',
		});
	});

	for (const [path, prefix] of [
		["/master-data/schools", "school"],
		["/master-data/items", "item"],
		["/master-data/vendor-prices", "vendor-item-price"],
		["/master-data/warehouses", "warehouse"],
	]) {
		test(`${path} has Export CSV`, async ({ page }) => {
			await openApp(page, path);
			const { name, header, rows } = await exportCsv(page);
			expect(name.startsWith(`${prefix}-`)).toBe(true);
			expect(header[0]).toBe("ID");
			expect(rows.length).toBeGreaterThan(0);
		});
	}

	test("read-only roles can export too", async ({ asRole }) => {
		const page = await asRole("finance");
		await openApp(page, "/master-data/vendors");
		await expect(page.getByRole("button", { name: "Import CSV" })).toHaveCount(0);
		const { rows } = await exportCsv(page);
		expect(rows.some((r) => r["Vendor Name"] === "E2E Vendor Alpha")).toBe(true);
	});
});

test.describe("Other lists export what they show", () => {
	test.use({ storageState: authFile("admin") });

	test("Procurement requests", async ({ page, browser }) => {
		const prId = await createPr(browser, { until: "approval" });
		await openApp(page, "/procurement");
		await expect(page.locator(".ve-data-table", { hasText: prId })).toBeVisible();
		const { name, rows } = await exportCsv(page);
		expect(name).toMatch(/^procurement-requests-/);
		expect(rows).toHaveLength(await tableRows(page).count());
		expect(rows.find((r) => r["PR ID"] === prId).Stage).toBe("Approval");
	});

	test("Location transfers", async ({ page }) => {
		await openApp(page, "/inventory");
		const recent = page.locator(".ve-widget", { hasText: "Recent Transfers" });
		const { name, header } = await exportCsv(page, recent);
		expect(name).toMatch(/^location-transfers-/);
		expect(header).toEqual(
			expect.arrayContaining(["Transfer ID", "Item", "From", "To", "Quantity", "Status"])
		);
	});

	test("Delivery discrepancies, with their status", async ({ page }) => {
		await openApp(page, "/dispatch");
		const { name, header } = await exportCsv(page);
		expect(name).toMatch(/^delivery-discrepancies-/);
		expect(header).toEqual(
			expect.arrayContaining(["Delivery Challan", "Status", "Resolution"])
		);
	});
});

test.describe("Vendor Prices row actions", () => {
	test.use({ storageState: authFile("admin") });

	test("Edit and Delete are spaced apart", async ({ page }) => {
		await openApp(page, "/master-data/vendor-prices");
		const row = page.locator(".ve-data-table tbody tr", { hasText: "E2E Vendor" }).first();
		const edit = await row.getByRole("button", { name: "Edit" }).boundingBox();
		const del = await row.getByRole("button", { name: "Delete" }).boundingBox();
		expect(del.x - (edit.x + edit.width)).toBeGreaterThanOrEqual(12);
	});
});
