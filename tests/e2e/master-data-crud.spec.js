// Master Data create / edit / delete for Kit, School and Vendor; Item
// discontinue; School/Vendor CSV import; and imported master
// data flowing through into a requisition, quotations and stock.
const {
	test,
	expect,
	authFile,
	field,
	fixtures,
	openApp,
	toast,
	selectByText,
} = require("./helpers");

test.use({ storageState: authFile("admin") });

const csv = (name, text) => ({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
const listRow = (page, text) => page.locator(".ve-data-table tbody tr", { hasText: text });

// Create forms mark every field required: fill them all with plausible
// values, then let the caller override what matters.
async function fillRequired(page, overrides) {
	for (const input of await page.locator(".ve-form-grid input[required]").all()) {
		const type = await input.getAttribute("type");
		await input.fill(
			type === "number" ? "10" : type === "email" ? "e2e@example.com" : "E2E value"
		);
	}
	for (const [label, value] of Object.entries(overrides)) await field(page, label).fill(value);
}

// window.confirm() — accept or dismiss the next one.
const answerConfirm = (page, accept) =>
	page.once("dialog", (d) => (accept ? d.accept() : d.dismiss()));

test.describe("Kit", () => {
	test("create with item rows, edit keeps the items, delete", async ({ page }) => {
		await openApp(page, "/master-data/kits/new");
		await field(page, "Kit Name").fill("E2E Form Kit");
		await field(page, "Kit Code").fill("E2E-FORM");
		await field(page, "Target School Type").selectOption("Govt");
		await field(page, "Preferred Vendor").selectOption({ label: "E2E Vendor Alpha" });

		const rows = page.locator(".ve-form-grid tbody tr");
		await rows.nth(0).locator("select").selectOption({ label: "E2E Slate" });
		await rows.nth(0).locator('input[type="number"]').fill("2");
		await page.getByRole("button", { name: "+ Add Item" }).click();
		await rows.nth(1).locator("select").selectOption({ label: "E2E Stylus" });
		await rows.nth(1).locator('input[type="number"]').fill("3");
		await page.getByRole("button", { name: "+ Add Item" }).click();
		await expect(rows).toHaveCount(3);
		await rows.nth(2).getByRole("button").click(); // remove the empty third row
		await expect(rows).toHaveCount(2);

		await page.getByRole("button", { name: "Save Kit" }).click();
		await expect(toast(page, "E2E Form Kit added to the Kit Master.")).toBeVisible();
		await expect(page).toHaveURL(/\/master-data\/kits\/VE-KIT-\d{4}$/);
		const itemsWidget = page.locator(".ve-widget", { hasText: "Items in This Kit" });
		await expect(itemsWidget).toContainText("E2E Slate");
		await expect(itemsWidget).toContainText("E2E Stylus");
		await expect(
			page.locator(".ve-detail-field", { hasText: "Preferred Vendor" })
		).toContainText("E2E Vendor Alpha");

		// Editing the kit must not wipe its items (regression: partial save).
		await page.getByRole("button", { name: "Edit Details" }).click();
		await field(page, "Description").fill("Edited by E2E");
		await page.getByRole("button", { name: "Save" }).click();
		await expect(toast(page, "Kit updated.")).toBeVisible();
		await page.reload();
		await expect(page.locator(".ve-widget", { hasText: "Items in This Kit" })).toContainText(
			"E2E Stylus"
		);

		// The list shows the vendor and school type columns.
		await openApp(page, "/master-data/kits");
		const row = listRow(page, "E2E Form Kit");
		await expect(row).toContainText("E2E Vendor Alpha");
		await expect(row).toContainText("Govt");
		await expect(row).toContainText("2"); // items count

		// Delete: dismissing the confirm keeps it; accepting deletes it.
		await row.locator(".ve-link").first().click();
		answerConfirm(page, false);
		await page.getByRole("button", { name: "Delete Kit" }).click();
		await expect(page).toHaveURL(/\/kits\/VE-KIT-/);
		answerConfirm(page, true);
		await page.getByRole("button", { name: "Delete Kit" }).click();
		await expect(toast(page, "Kit deleted.")).toBeVisible();
		await expect(page).toHaveURL(/\/master-data\/kits$/);
		await expect(listRow(page, "E2E Form Kit")).toHaveCount(0);
	});

	test("a kit needs at least one item", async ({ page }) => {
		await openApp(page, "/master-data/kits/new");
		await field(page, "Kit Name").fill("E2E Empty Kit");
		await field(page, "Kit Code").fill("E2E-EMPTY");
		await page.getByRole("button", { name: "Save Kit" }).click();
		await expect(toast(page, "Add at least one item to this kit.")).toBeVisible();
		await expect(page).toHaveURL(/\/kits\/new/);
	});
});

test.describe("School", () => {
	test("create, edit, delete", async ({ page }) => {
		await openApp(page, "/master-data/schools/new");
		await fillRequired(page, {
			"School Name": "E2E Form School",
			State: "E2E State",
			Pincode: "800001",
		});
		await page.getByRole("button", { name: "Save School" }).click();
		await expect(toast(page, "E2E Form School added to the School Master.")).toBeVisible();

		await openApp(page, "/master-data/schools");
		await listRow(page, "E2E Form School").locator(".ve-link").first().click();
		await page.getByRole("button", { name: "Edit Details" }).click();
		await field(page, "City").fill("E2E Edited City");
		await page.getByRole("button", { name: "Save" }).click();
		await expect(toast(page, "School updated.")).toBeVisible();
		await expect(page.locator(".ve-view")).toContainText("E2E Edited City");

		answerConfirm(page, true);
		await page.getByRole("button", { name: "Delete School" }).click();
		await expect(toast(page, "School deleted.")).toBeVisible();
		await expect(listRow(page, "E2E Form School")).toHaveCount(0);
	});

	test("Type filter (was permanently disabled) filters by Govt / Private", async ({ page }) => {
		await openApp(page, "/master-data/schools");
		const type = page.locator(".ve-toolbar select").nth(1);
		await expect(type).toBeEnabled();
		await type.selectOption("Private");
		await expect(listRow(page, "E2E School North")).toHaveCount(0);
		await type.selectOption("Govt");
		await expect(listRow(page, "E2E School North")).toHaveCount(1);
	});

	test("school dispatch history links to the PR", async ({ page }) => {
		await openApp(page, "/master-data/schools");
		await listRow(page, "E2E School North").locator(".ve-link").first().click();
		const history = page.locator(".ve-widget", {
			hasText: "Recent Dispatches to This School",
		});
		await expect(history.locator("tbody tr").first()).toContainText("DC-");
		await history.locator("tbody tr .ve-link").first().click();
		await expect(page).toHaveURL(/\/procurement\/PR-.+\/status/);
	});
});

test.describe("Vendor", () => {
	test("create, edit, deactivate, reactivate", async ({ page }) => {
		await openApp(page, "/master-data/vendors/new");
		await fillRequired(page, { "Vendor Name": "E2E Form Vendor", "IFSC Code": "HDFC0000001" });
		await page.getByRole("button", { name: "Save Vendor" }).click();
		await expect(toast(page, "E2E Form Vendor added to the Vendor Master.")).toBeVisible();

		await openApp(page, "/master-data/vendors");
		await listRow(page, "E2E Form Vendor").locator(".ve-link").first().click();
		await page.getByRole("button", { name: "Edit Details" }).click();
		await field(page, "Contact Person").fill("E2E Edited Contact");
		await page.getByRole("button", { name: "Save" }).click();
		await expect(toast(page, "Vendor updated.")).toBeVisible();
		await expect(page.locator(".ve-view")).toContainText("E2E Edited Contact");

		answerConfirm(page, true);
		await page.getByRole("button", { name: "Deactivate Vendor" }).click();
		await expect(toast(page, "Vendor deactivated.")).toBeVisible();
		await expect(page.locator(".ve-view")).toContainText("Inactive");

		answerConfirm(page, true);
		await page.getByRole("button", { name: "Activate Vendor" }).click();
		await expect(toast(page, "Vendor activated.")).toBeVisible();
		await expect(page.locator(".ve-status-text")).toHaveText("Active");
		await expect(page.getByRole("button", { name: "Deactivate Vendor" })).toBeVisible();
	});

	test("renaming to another vendor's name is allowed", async ({ page }) => {
		const f = fixtures();
		await openApp(page, `/master-data/vendors/${encodeURIComponent(f.vendors[0])}`);
		const original = await page.locator(".ve-widget-title").first().textContent();
		const other = await page.evaluate(
			async (name) =>
				(
					await frappe.db.get_value("Vendor", name, "vendor_name")
				).message.vendor_name,
			f.vendors[1]
		);

		await page.getByRole("button", { name: "Edit Details" }).click();
		await field(page, "Vendor Name").fill(other);
		await page.getByRole("button", { name: "Save" }).click();
		await expect(toast(page, "Vendor updated.")).toBeVisible();
		await expect(page.locator(".ve-widget-title").first()).toHaveText(other);

		// Restore, so other specs see the fixture name.
		await page.getByRole("button", { name: "Edit Details" }).click();
		await field(page, "Vendor Name").fill(original.trim());
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.locator(".ve-widget-title").first()).toHaveText(original.trim());
	});
});

test.describe("Item extras", () => {
	test("discontinue (cancel, then confirm), then reactivate", async ({ page }) => {
		await openApp(page, "/master-data/items/new");
		await fillRequired(page, { "Item Name": "E2E Discontinue Me" });
		await page.getByRole("button", { name: /Save/ }).click();
		await expect(toast(page, "E2E Discontinue Me added")).toBeVisible();

		answerConfirm(page, false);
		await page.getByRole("button", { name: "Discontinue Item" }).click();
		await expect(toast(page, "Item discontinued.")).toHaveCount(0);

		answerConfirm(page, true);
		await page.getByRole("button", { name: "Discontinue Item" }).click();
		await expect(toast(page, "Item discontinued.")).toBeVisible();

		answerConfirm(page, true);
		await page.getByRole("button", { name: "Reactivate Item" }).click();
		await expect(toast(page, "Item reactivated.")).toBeVisible();
		await expect(page.getByRole("button", { name: "Discontinue Item" })).toBeVisible();
	});

	test("cancelling an edit discards it", async ({ page }) => {
		await openApp(page, "/master-data/items");
		await page.locator(".ve-toolbar-search").fill("E2E Slate");
		await listRow(page, "E2E Slate").locator(".ve-link").first().click();
		await page.getByRole("button", { name: "Edit Details" }).click();
		await field(page, "Item Name").fill("Should not save");
		await page.getByRole("button", { name: "Cancel" }).click();
		await expect(page.locator(".ve-widget-title").first()).toHaveText("E2E Slate");
	});
});

test.describe("CSV import — School and Vendor lists", () => {
	test("schools import", async ({ page }) => {
		await openApp(page, "/master-data/schools");
		await page
			.locator("#ve-import-school")
			.setInputFiles(
				csv(
					"schools.csv",
					"School Name,State,School Type,Active\nE2E CSV School,E2E State,Govt,1\n"
				)
			);
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();
		await expect(listRow(page, "E2E CSV School")).toHaveCount(1);
	});

	test("vendors import", async ({ page }) => {
		await openApp(page, "/master-data/vendors");
		await page
			.locator("#ve-import-vendor")
			.setInputFiles(
				csv("vendors.csv", "Vendor Name,State,Active\nE2E CSV Vendor,E2E State,yes\n")
			);
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();
		await expect(listRow(page, "E2E CSV Vendor")).toHaveCount(1);
	});
});

test.describe("imported master data flows through to a PR, quotations and stock", () => {
	test("import vendor, item, kit, price and school, then use them", async ({ page, asRole }) => {
		await openApp(page, "/master-data/vendors");
		await page
			.locator("#ve-import-vendor")
			.setInputFiles(csv("v.csv", "Vendor Name,Active\nE2E Imported Vendor,1\n"));
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();

		await openApp(page, "/master-data/items");
		await page
			.locator("#ve-import-item")
			.setInputFiles(
				csv(
					"i.csv",
					"Item Name,Category,Unit,Active,Opening Stock,Reorder Level\nE2E Imported Item,IT,Nos,1,7,20\n"
				)
			);
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();

		await openApp(page, "/master-data/schools");
		await page
			.locator("#ve-import-school")
			.setInputFiles(
				csv(
					"s.csv",
					"School Name,State,School Type,Active\nE2E Imported School,E2E Import State,Govt,1\n"
				)
			);
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();

		// Prices reference the vendor and item by name, not ID.
		await openApp(page, "/master-data/vendor-prices");
		await page
			.locator("#ve-import-vendor-item-price")
			.setInputFiles(
				csv(
					"p.csv",
					"Vendor,Item,Unit Price,Effective Date\nE2E Imported Vendor,E2E Imported Item,250,2026-01-01\n"
				)
			);
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();
		await expect(listRow(page, "E2E Imported Item")).toContainText("₹250");

		// Stock Status picks up the imported opening stock and reorder level.
		await openApp(page, "/reports/stock-status");
		const stock = listRow(page, "E2E Imported Item");
		await expect(stock.locator("td").nth(5)).toHaveText("7");
		await expect(stock).toContainText("Below Reorder");

		// A kit built from the imported item, referenced by name.
		await openApp(page, "/master-data/kits");
		await page
			.locator("#ve-import-kit")
			.setInputFiles(
				csv(
					"k.csv",
					'Kit Name,Kit Code,Active,Kit Items\nE2E Imported Kit,E2E-IMP,1,"E2E Imported Item:2"\n'
				)
			);
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();

		// A Field User can raise a PR for the kit; the estimate uses the
		// imported price (2 kits × 2 items × ₹250).
		const fieldUser = await asRole("field");
		await openApp(fieldUser, "/procurement/new");
		await field(fieldUser, "Kit").selectOption({ label: "E2E Imported Kit" });
		await field(fieldUser, "Quantity").fill("2");
		await field(fieldUser, "Expected Delivery").fill("2026-12-31");
		await fieldUser.getByLabel("E2E Imported School").check();
		await fieldUser.getByRole("button", { name: "Submit for Approval" }).click();
		await expect(fieldUser).toHaveURL(/\/status/);
		const prId = decodeURIComponent(fieldUser.url().match(/procurement\/([^/]+)\/status/)[1]);

		const manager = await asRole("manager");
		await openApp(manager, `/procurement/${prId}/approval`);
		await expect(
			manager.locator(".ve-detail-field", { hasText: "Estimated Value" })
		).toContainText("₹1,000");
		await manager.getByRole("button", { name: "Approve" }).click();
		await expect(manager).toHaveURL(/\/status/);

		// The imported vendor is offered for quotations.
		await openApp(page, `/procurement/${prId}/vendor/quotations`);
		await selectByText(field(page, "Vendor"), "E2E Imported Vendor");
	});
});
