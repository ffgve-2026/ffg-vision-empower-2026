// Master Data: Item create/edit, Vendor Prices, CSV import.
const { test, expect, authFile, field, openApp, toast } = require("./helpers");

test.use({ storageState: authFile("admin") });

const csv = (name, text) => ({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
const listRow = (page, text) => page.locator(".ve-data-table tbody tr", { hasText: text });

test.describe("Item Master", () => {
	test("two new items both save and show in the list (naming-series regression)", async ({
		page,
	}) => {
		for (const name of ["E2E UI Item One", "E2E UI Item Two"]) {
			await openApp(page, "/master-data/items/new");
			await field(page, "Item Name").fill(name);
			await field(page, "Category").selectOption("STEM");
			await field(page, "Unit").fill("Nos");
			await field(page, "Per-School Qty Norm").fill("1");
			await page
				.getByRole("button", { name: /Create|Save|Add/ })
				.first()
				.click();
			await expect(toast(page, `${name} added to the Item Master.`)).toBeVisible();
			await expect(page).toHaveURL(/\/master-data\/items\/VE-ITM-\d{4}$/);
		}

		await openApp(page, "/master-data/items");
		await page.locator(".ve-toolbar-search").fill("E2E UI Item");
		await expect(listRow(page, "E2E UI Item")).toHaveCount(2);
	});

	test("item name is required", async ({ page }) => {
		await openApp(page, "/master-data/items/new");
		await page
			.getByRole("button", { name: /Create|Save|Add/ })
			.first()
			.click();
		expect(await field(page, "Item Name").evaluate((el) => el.validity.valueMissing)).toBe(
			true
		);
		await expect(page).toHaveURL(/\/items\/new/);
	});

	test("editing an item saves the change", async ({ page }) => {
		await openApp(page, "/master-data/items");
		await page.locator(".ve-toolbar-search").fill("E2E Stylus");
		await listRow(page, "E2E Stylus").locator(".ve-link").first().click();
		await page.getByRole("button", { name: "Edit Details" }).click();
		await field(page, "Unit").fill("Pcs");
		await page.getByRole("button", { name: "Save" }).click();
		await expect(toast(page, "Item updated.")).toBeVisible();
	});
});

test.describe("Vendor Prices", () => {
	test("add, edit and delete a price", async ({ page }) => {
		await openApp(page, "/master-data/vendor-prices");
		await field(page, "Vendor").selectOption({ label: "E2E Vendor Beta" });
		await field(page, "Item").selectOption({ label: "E2E Stylus" });
		await field(page, "Unit Price").fill("45");
		await field(page, "GST").fill("12");
		await page.getByRole("button", { name: "Add Price" }).click();
		await expect(toast(page, "Price saved.")).toBeVisible();

		const row = page
			.locator(".ve-data-table tbody tr", { hasText: "E2E Vendor Beta" })
			.filter({ hasText: "E2E Stylus" });
		await expect(row).toContainText("₹45");
		await expect(row).toContainText("12%");

		await row.getByRole("button", { name: "Edit" }).click();
		await expect(page.getByRole("heading", { name: "Edit Price" })).toBeVisible();
		await field(page, "Unit Price").fill("50");
		await page.getByRole("button", { name: "Update Price" }).click();
		await expect(row).toContainText("₹50");

		await row.getByRole("button", { name: "Delete" }).click();
		await expect(toast(page, "Price deleted.")).toBeVisible();
		await expect(row).toHaveCount(0);
	});

	test("a zero price is rejected by the server", async ({ page }) => {
		await openApp(page, "/master-data/vendor-prices");
		await field(page, "Vendor").selectOption({ label: "E2E Vendor Beta" });
		await field(page, "Item").selectOption({ label: "E2E Slate" });
		await field(page, "Unit Price").fill("0");
		await page.getByRole("button", { name: "Add Price" }).click();
		await expect(toast(page, "Could not save the price.")).toBeVisible();
		await expect(page.locator(".msgprint")).toContainText(
			"Unit price must be greater than zero."
		);
	});

	test("filters by vendor, and Vendor Detail lists that vendor's prices", async ({ page }) => {
		await openApp(page, "/master-data/vendor-prices");
		await page
			.locator(".ve-toolbar select")
			.first()
			.selectOption({ label: "E2E Vendor Alpha" });
		await expect(
			page.locator(".ve-data-table tbody tr", { hasText: "E2E Vendor Beta" })
		).toHaveCount(0);

		await listRow(page, "E2E Slate")
			.locator(".ve-link", { hasText: "E2E Vendor Alpha" })
			.click();
		await expect(page).toHaveURL(/\/master-data\/vendors\//);
		const prices = page.locator(".ve-widget", { hasText: "Associated Procurement Items" });
		await expect(prices.locator("tr", { hasText: "E2E Slate" })).toContainText("₹120");
	});
});

test.describe("CSV import", () => {
	test("imports good rows, reports bad ones, accepts labels and names", async ({ page }) => {
		await openApp(page, "/master-data/items");
		await page
			.locator("#ve-import-item")
			.setInputFiles(
				csv(
					"items.csv",
					"Item Name,Category,Unit,Active,Reorder Level,Bogus Column\n" +
						"E2E CSV Item A,Lab,Nos,yes,5,x\n" +
						"E2E CSV Item B,NotACategory,Nos,1,0,x\n"
				)
			);
		await expect(toast(page, /Imported 1, 1 failed — first: Row 2/)).toBeVisible();
		await expect(toast(page, "Ignored columns: Bogus Column")).toBeVisible();

		await page.locator(".ve-toolbar-search").fill("E2E CSV Item");
		await expect(listRow(page, "E2E CSV Item A")).toHaveCount(1);
		await expect(listRow(page, "E2E CSV Item B")).toHaveCount(0);
	});

	test("kit items import from 'Item:qty; Item:qty'", async ({ page }) => {
		await openApp(page, "/master-data/kits");
		await page
			.locator("#ve-import-kit")
			.setInputFiles(
				csv(
					"kits.csv",
					'Kit Name,Kit Code,Active,Kit Items\nE2E CSV Kit,E2E-CSV,1,"E2E Slate:2; E2E Stylus:3"\n'
				)
			);
		await expect(toast(page, "Imported 1 record(s).")).toBeVisible();
		await expect(listRow(page, "E2E CSV Kit")).toHaveCount(1);
	});

	test("an unknown linked name fails that row", async ({ page }) => {
		await openApp(page, "/master-data/kits");
		await page
			.locator("#ve-import-kit")
			.setInputFiles(
				csv(
					"kits.csv",
					'Kit Name,Kit Code,Kit Items\nE2E Bad Kit,E2E-BAD,"No Such Item:1"\n'
				)
			);
		await expect(
			toast(page, /Imported 0, 1 failed — first: Row 1: Item 'No Such Item' not found/)
		).toBeVisible();
	});

	test("Template downloads the header row", async ({ page }) => {
		await openApp(page, "/master-data/vendors");
		const [download] = await Promise.all([
			page.waitForEvent("download"),
			page.getByRole("button", { name: "Template" }).click(),
		]);
		expect(download.suggestedFilename()).toBe("vendor-import-template.csv");
		const content = require("fs").readFileSync(await download.path(), "utf-8");
		expect(content).toContain("Vendor Name");
	});
});
