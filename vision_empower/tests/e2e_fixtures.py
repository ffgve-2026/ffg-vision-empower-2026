"""Seed and clean up data for the Playwright UI suite (tests/e2e/).

Two ways to run it, never against production data:
	bench --site <site> execute vision_empower.tests.e2e_fixtures.setup      (local bench)
	POST /api/method/vision_empower.tests.e2e_fixtures.setup                 (cloud site, as a
	                                                                          System Manager API key)
and the same with `teardown`.

Everything created here is either named with the "E2E " prefix or owned by
one of the e2e-*@visionempower.test users, which is how teardown() finds it.
Refuses to run unless the site has `allow_tests` set, and over HTTP only for
System Manager.
"""

import frappe

from vision_empower.vision_empower import api

PASSWORD = "E2e-Test-Pass-2026!"
DOMAIN = "visionempower.test"

USERS = {
	"field": ("e2e-field", "Vision Empower Field User"),
	"manager": ("e2e-manager", "Vision Empower Senior Manager"),
	"admin": ("e2e-admin", "Vision Empower Admin"),
	"finance": ("e2e-finance", "Vision Empower Finance"),
}

# Child-most first, so links are gone before what they point at.
OWNED_DOCTYPES = [
	"Delivery Discrepancy",
	"Delivery Challan",
	"Good Receipt Notes",
	"Payment",
	"Vendor Invoice",
	"VE Purchase Order",
	"Vendor Quotation",
	"Procurement Requisition",
	"Location Transfer",
	"Vendor Item Price",
	"Kit",
	"Item",
	"School",
	"Vendor",
	"Warehouse",
	"File",
]

# Seed records, matched by their title field.
SEED_TITLES = {
	"Kit": "kit_name",
	"Item": "item_name",
	"School": "school_name",
	"Vendor": "vendor_name",
	"Warehouse": "warehouse_name",
}


def _guard():
	frappe.only_for("System Manager")
	if not frappe.conf.get("allow_tests"):
		frappe.throw("Refusing to touch data: set `allow_tests` in this site's config first.")


def _email(key: str) -> str:
	return f"{USERS[key][0]}@{DOMAIN}"


def _user_emails() -> list[str]:
	return [_email(key) for key in USERS] + [f"e2e-norole@{DOMAIN}"]


def _make_user(email: str, first_name: str, role: str | None):
	user = frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": first_name,
			"send_welcome_email": 0,
			"user_type": "System User",
			"new_password": PASSWORD,
			"roles": [{"role": role}] if role else [],
		}
	)
	user.flags.ignore_password_policy = True
	user.insert(ignore_permissions=True)


@frappe.whitelist(methods=["POST"])
def setup() -> dict:
	"""Fresh users + seed data + one PR already dispatched (for discrepancy
	and report tests). Returns the names the specs need."""
	_guard()
	teardown()
	frappe.set_user("Administrator")

	for key, (local, role) in USERS.items():
		_make_user(_email(key), f"E2E {key.title()}", role)
	_make_user(f"e2e-norole@{DOMAIN}", "E2E Norole", None)

	def insert(doc):
		return frappe.get_doc(doc).insert(ignore_permissions=True)

	vendor_a = insert({"doctype": "Vendor", "vendor_name": "E2E Vendor Alpha", "active": 1, "state": "E2E State"})
	vendor_b = insert({"doctype": "Vendor", "vendor_name": "E2E Vendor Beta", "active": 1, "state": "E2E State"})
	school_n = insert({"doctype": "School", "school_name": "E2E School North", "state": "E2E State", "active": 1, "school_type": "Govt"})
	school_s = insert({"doctype": "School", "school_name": "E2E School South", "state": "E2E State", "active": 1, "school_type": "Govt"})
	slate = insert({"doctype": "Item", "item_name": "E2E Slate", "category": "Braille", "unit": "Nos", "active": 1, "reorder_level": 50, "opening_stock": 10})
	stylus = insert({"doctype": "Item", "item_name": "E2E Stylus", "category": "Braille", "unit": "Nos", "active": 1, "reorder_level": 0, "opening_stock": 100})
	kit = insert(
		{
			"doctype": "Kit",
			"kit_name": "E2E Braille Kit",
			"kit_code": "E2E-KIT",
			"active": 1,
			"kit_items": [{"item": slate.name, "quantity": 1, "uom": "Nos"}, {"item": stylus.name, "quantity": 2, "uom": "Nos"}],
		}
	)
	wh_a = insert({"doctype": "Warehouse", "warehouse_name": "E2E Warehouse A", "warehouse_type": "Central", "active": 1})
	wh_b = insert({"doctype": "Warehouse", "warehouse_name": "E2E Warehouse B", "warehouse_type": "Field", "active": 1})
	for item, price in ((slate, 120), (stylus, 30)):
		insert({"doctype": "Vendor Item Price", "vendor": vendor_a.name, "item": item.name, "unit_price": price, "effective_date": "2026-01-01"})

	# A PR walked through to "Delivery Pending" by the real role users, so
	# its Delivery Challans exist for the discrepancy/report specs.
	def as_user(key, fn, *args, **kwargs):
		frappe.set_user(_email(key))
		try:
			return fn(*args, **kwargs)
		finally:
			frappe.set_user("Administrator")

	def upload(key, name):
		# Stage endpoints only attach files the acting user uploaded.
		file = as_user(
			key,
			lambda: frappe.get_doc({"doctype": "File", "file_name": name, "content": b"e2e", "is_private": 1}).insert(),
		)
		return file.file_url

	pr = as_user(
		"field",
		api.submit_purchase_requisition,
		quantity="4",
		expected_delivery="2026-12-31",
		kit_type=kit.name,
		target_schools=frappe.as_json([school_n.name, school_s.name]),
	)["pr_id"]
	as_user("manager", api.decide_purchase_requisition, pr, "approve")
	quote = as_user("admin", api.add_vendor_quotation, pr, vendor_a.name, "1000", quote_ref="E2E-Q1", delivery_days="5")
	as_user("admin", api.close_quotation_collection, pr)
	as_user("admin", api.select_vendor, pr, quote["quotation"]["name"], "Seeded")
	invoice_url = upload("finance", "e2e-invoice.txt")
	as_user("finance", api.decide_payment_approval, pr, "approve", invoice_number="E2E-INV-1", amount="1000", file_url=invoice_url)
	as_user("finance", api.record_payment, pr, "1000", "NEFT", frappe.utils.nowdate(), "E2E-UTR-1", "E2E Bank")
	dispatch = as_user("admin", api.confirm_dispatch, pr, frappe.utils.nowdate(), "E2E Transport", "E2E-LR-1")

	frappe.db.commit()
	return {
		"password": PASSWORD,
		"users": {key: _email(key) for key in USERS} | {"norole": f"e2e-norole@{DOMAIN}"},
		"vendors": [vendor_a.name, vendor_b.name],
		"schools": [school_n.name, school_s.name],
		"items": {"slate": slate.name, "stylus": stylus.name},
		"kit": kit.name,
		"warehouses": [wh_a.name, wh_b.name],
		"dispatched_pr": pr,
		"challans": dispatch["delivery_challans"],
	}


@frappe.whitelist(methods=["POST"])
def teardown() -> dict:
	"""Delete every E2E record and user. Safe to run repeatedly."""
	_guard()
	frappe.set_user("Administrator")
	users = _user_emails()
	deleted = 0

	for doctype in OWNED_DOCTYPES:
		names = set(frappe.get_all(doctype, filters={"owner": ["in", users]}, pluck="name"))
		if doctype in SEED_TITLES:
			names |= set(frappe.get_all(doctype, filters={SEED_TITLES[doctype]: ["like", "E2E %"]}, pluck="name"))
		if doctype == "Vendor Item Price":
			e2e_vendors = frappe.get_all("Vendor", filters={"vendor_name": ["like", "E2E %"]}, pluck="name")
			names |= set(frappe.get_all(doctype, filters={"vendor": ["in", e2e_vendors or [""]]}, pluck="name"))
		for name in names:
			frappe.delete_doc(doctype, name, force=True, ignore_permissions=True, delete_permanently=True)
			deleted += 1

	for name in users:
		if frappe.db.exists("User", name):
			frappe.delete_doc("User", name, force=True, ignore_permissions=True)
			deleted += 1

	frappe.db.commit()
	return {"deleted": deleted}
