// Master Data → Warehouses: Admin adds, renames, deactivates; other roles
// only read. Active warehouses feed the Location Transfer dropdowns.
const { test, expect, authFile, field, openApp, toast, callMethod, api } = require("./helpers");

const row = (page, name) =>
	page.locator(".ve-data-table tbody tr", {
		has: page.locator("td", { hasText: new RegExp(`^${name}$`) }),
	});

test.describe("Warehouses", () => {
	test.use({ storageState: authFile("admin") });

	test("add, rename, deactivate and reactivate a warehouse", async ({ page }) => {
		await openApp(page, "/master-data/warehouses");
		await field(page, "Warehouse Name").fill("E2E Warehouse New");
		await field(page, "Warehouse Type").selectOption("Field");
		await field(page, "Address").fill("Gaya, Bihar");
		await page.getByRole("button", { name: "Add Warehouse" }).click();
		await expect(toast(page, "Warehouse saved.")).toBeVisible();
		await expect(row(page, "E2E Warehouse New")).toContainText("Field");
		await expect(row(page, "E2E Warehouse New")).toContainText("Active");

		// Renaming keeps it one record (the ID is the name, so it's renamed).
		await row(page, "E2E Warehouse New").getByRole("button", { name: "Edit" }).click();
		await expect(field(page, "Warehouse Name")).toHaveValue("E2E Warehouse New");
		await field(page, "Warehouse Name").fill("E2E Warehouse Renamed");
		await page.getByRole("button", { name: "Update Warehouse" }).click();
		await expect(toast(page, "Warehouse saved.")).toBeVisible();
		await expect(row(page, "E2E Warehouse Renamed")).toBeVisible();
		await expect(row(page, "E2E Warehouse New")).toHaveCount(0);

		// Inactive warehouses drop out of Location Transfer.
		await row(page, "E2E Warehouse Renamed")
			.getByRole("button", { name: "Deactivate" })
			.click();
		await expect(toast(page, "Warehouse deactivated.")).toBeVisible();
		await expect(row(page, "E2E Warehouse Renamed")).toContainText("Inactive");
		await openApp(page, "/inventory");
		const from = field(page, "From Location");
		await expect(from.locator("option", { hasText: "E2E Warehouse A" })).toHaveCount(1);
		await expect(from.locator("option", { hasText: "E2E Warehouse Renamed" })).toHaveCount(0);

		await openApp(page, "/master-data/warehouses");
		await row(page, "E2E Warehouse Renamed").getByRole("button", { name: "Activate" }).click();
		await expect(toast(page, "Warehouse activated.")).toBeVisible();
		await openApp(page, "/inventory");
		await expect(
			field(page, "From Location").locator("option", { hasText: "E2E Warehouse Renamed" })
		).toHaveCount(1);
	});

	test("a second warehouse can't take an existing name", async ({ page }) => {
		await openApp(page, "/master-data/warehouses");
		await field(page, "Warehouse Name").fill("E2E Warehouse A");
		await page.getByRole("button", { name: "Add Warehouse" }).click();
		await expect(toast(page, "Could not save the warehouse.")).toBeVisible();
	});

	test("Field User sees warehouses but can't change them", async ({ asRole }) => {
		const page = await asRole("field");
		await openApp(page, "/master-data/warehouses");
		await expect(row(page, "E2E Warehouse A")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Add Warehouse" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Import CSV" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();

		const res = await callMethod(page, api("save_warehouse"), {
			warehouse_name: "E2E Sneaky Warehouse",
			warehouse_type: "Field",
		});
		expect(res.status).toBe(403);
	});
});
