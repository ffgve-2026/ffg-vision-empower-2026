"""A realistic demo dataset for the user-guide screenshots (docs/user-guide/).

Same safety rules and users as e2e_fixtures (allow_tests only, System
Manager only over HTTP), but with real-looking names and PRs sitting at
every workflow stage, so each role's dashboard and each step has something
to show. Everything is created by the e2e-* users, so
e2e_fixtures.teardown() removes it.

	bench --site <site> execute vision_empower.tests.demo_fixtures.setup
	bench --site <site> execute vision_empower.tests.e2e_fixtures.teardown
"""

import io

import frappe
from frappe.utils import add_days, nowdate

from vision_empower.tests import e2e_fixtures as base
from vision_empower.vision_empower import api

DISPLAY_NAMES = {
	"field": "Riya Sen",
	"manager": "Arun Iyer",
	"admin": "Kavya Rao",
	"finance": "Meera Das",
}


def _pdf(title: str) -> bytes:
	"""A small real PDF (Frappe validates uploaded PDFs)."""
	from pypdf import PdfWriter

	writer = PdfWriter()
	writer.add_blank_page(width=420, height=595)
	writer.add_metadata({"/Title": title})
	out = io.BytesIO()
	writer.write(out)
	return out.getvalue()


@frappe.whitelist(methods=["POST"])
def setup() -> dict:
	base._guard()
	base.teardown()
	frappe.set_user("Administrator")

	for key, (_local, role) in base.USERS.items():
		base._make_user(base._email(key), DISPLAY_NAMES[key], role)
	base._make_user(f"e2e-norole@{base.DOMAIN}", "No Role", None)

	def as_user(key, fn, *args, **kwargs):
		frappe.set_user(base._email(key))
		try:
			return fn(*args, **kwargs)
		finally:
			frappe.set_user("Administrator")

	def insert(doc):
		# Created by the demo Admin, so teardown (by owner) removes it.
		return as_user("admin", lambda: frappe.get_doc(doc).insert(ignore_permissions=True))

	def upload(key, name, title):
		file = as_user(
			key,
			lambda: frappe.get_doc(
				{"doctype": "File", "file_name": name, "content": _pdf(title), "is_private": 1}
			).insert(),
		)
		return file.file_url

	# --- master data ---------------------------------------------------------
	vendors = {
		key: insert(
			{
				"doctype": "Vendor",
				"vendor_name": name,
				"active": 1,
				"city": city,
				"state": state,
				"category": cat,
			}
		)
		for key, name, city, state, cat in [
			("apex", "Apex Educational Supplies", "Patna", "Bihar", "Braille, STEM"),
			("bharat", "Bharat School Solutions", "Ranchi", "Jharkhand", "Books, IT"),
			("stem", "STEM Learning Co.", "Bengaluru", "Karnataka", "STEM, Lab"),
		]
	}
	schools = {
		key: insert(
			{
				"doctype": "School",
				"school_name": name,
				"state": state,
				"district": district,
				"city": district,
				"school_type": stype,
				"active": 1,
				"student_count": students,
				"students_with_disabilities": swd,
			}
		)
		for key, name, state, district, stype, students, swd in [
			("gaya", "Govt Middle School, Gaya", "Bihar", "Gaya", "Govt", 420, 38),
			("patna", "Patna Girls Senior Academy", "Bihar", "Patna", "Govt", 610, 22),
			("nalanda", "Nalanda Education Center", "Bihar", "Nalanda", "Private", 280, 15),
			("ranchi", "Ranchi Inclusive School", "Jharkhand", "Ranchi", "Govt", 350, 41),
		]
	}
	items = {
		key: insert(
			{
				"doctype": "Item",
				"item_name": name,
				"category": cat,
				"unit": unit,
				"active": 1,
				"school_norm_qty": norm,
				"reorder_level": reorder,
				"opening_stock": opening,
			}
		)
		for key, name, cat, unit, norm, reorder, opening in [
			("slate", "Braille Slate & Stylus", "Braille", "Set", 10, 50, 20),
			("paper", "Braille Paper Ream", "Braille", "Ream", 20, 100, 60),
			("geometry", "Tactile Geometry Set", "STEM", "Set", 5, 0, 120),
			("calculator", "Talking Calculator", "IT", "Nos", 4, 30, 0),
		]
	}
	kit = insert(
		{
			"doctype": "Kit",
			"kit_name": "Braille Starter Kit",
			"kit_code": "BRL-START-01",
			"active": 1,
			"target_school_type": "Govt",
			"preferred_vendor": vendors["apex"].name,
			"description": "Starter set for a primary class of visually impaired students.",
			"kit_items": [
				{"item": items["slate"].name, "quantity": 1, "uom": "Set"},
				{"item": items["paper"].name, "quantity": 2, "uom": "Ream"},
				{"item": items["geometry"].name, "quantity": 1, "uom": "Set"},
			],
		}
	)
	warehouses = [
		insert({"doctype": "Warehouse", "warehouse_name": name, "warehouse_type": wtype, "active": 1})
		for name, wtype in [("Central Warehouse - Patna", "Central"), ("Field Store - Gaya", "Field")]
	]
	for vendor, item, price, gst in [
		("apex", "slate", 450, 12),
		("apex", "paper", 280, 12),
		("apex", "geometry", 650, 18),
		("bharat", "slate", 480, 12),
		("bharat", "calculator", 1200, 18),
		("stem", "geometry", 610, 18),
	]:
		insert(
			{
				"doctype": "Vendor Item Price",
				"vendor": vendors[vendor].name,
				"item": items[item].name,
				"unit_price": price,
				"gst_rate": gst,
				"effective_date": "2026-04-01",
			}
		)

	fund = frappe.db.get_value("Fund", {}, "name")

	# --- PRs at every stage --------------------------------------------------
	def raise_pr(kit_qty=None, item=None, qty=None, school_keys=("gaya", "patna"), remarks=""):
		return as_user(
			"field",
			api.submit_purchase_requisition,
			quantity=str(kit_qty or qty),
			expected_delivery=add_days(nowdate(), 30),
			kit_type=kit.name if kit_qty else "",
			item_type=items[item].name if item else "",
			target_schools=frappe.as_json([schools[k].name for k in school_keys]),
			fund=fund or "",
			remarks=remarks,
		)["pr_id"]

	def approve(pr, remarks="Within this quarter's budget."):
		as_user("manager", api.decide_purchase_requisition, pr, "approve", remarks)

	def quote(pr, vendor, amount, days, ref):
		return as_user(
			"admin",
			api.add_vendor_quotation,
			pr,
			vendors[vendor].name,
			str(amount),
			quote_ref=ref,
			delivery_days=str(days),
			valid_until=add_days(nowdate(), 30),
			file_url=upload("admin", f"quotation-{ref.lower()}.pdf", f"Quotation {ref}"),
		)["quotation"]["name"]

	def select(pr, quotation, why="Lowest quote with the shortest delivery time."):
		as_user("admin", api.close_quotation_collection, pr)
		as_user("admin", api.select_vendor, pr, quotation, why)

	def approve_payment(pr, amount, inv):
		as_user(
			"finance",
			api.decide_payment_approval,
			pr,
			"approve",
			invoice_number=inv,
			amount=str(amount),
			file_url=upload("finance", f"invoice-{inv.lower()}.pdf", f"Invoice {inv}"),
			remarks="Invoice matches the PO.",
		)

	def pay(pr, amount, utr):
		as_user(
			"finance",
			api.record_payment,
			pr,
			str(amount),
			"NEFT",
			nowdate(),
			utr,
			"Vision Empower — HDFC Bank **** 4821",
			remarks="Full payment released.",
		)

	def dispatch(pr, lr):
		return as_user(
			"admin",
			api.confirm_dispatch,
			pr,
			nowdate(),
			"BlueDart",
			lr,
			file_url=upload("admin", f"transit-insurance-{lr.lower()}.pdf", f"Transit insurance {lr}"),
		)

	prs = {}

	# Completed — the full audit trail.
	pr = raise_pr(kit_qty=12, remarks="Term starts in three weeks; needed for the new Braille class.")
	approve(pr)
	q = quote(pr, "apex", 15800, 7, "QT-1024")
	quote(pr, "bharat", 16900, 10, "QT-1031")
	select(pr, q)
	approve_payment(pr, 15800, "AES-INV-2207")
	pay(pr, 15800, "HDFCN52026101100")
	dispatch(pr, "BD-778120")
	as_user(
		"field",
		api.confirm_delivery,
		pr,
		nowdate(),
		"Mrs. Sunita Kumari, Headmistress",
		"Good",
		"Received in full and signed by the school.",
		upload("field", "signed-challan-gaya.pdf", "Signed delivery challan"),
	)
	prs["completed"] = pr

	# Delivery Pending — dispatched; one school reports a shortage.
	pr = raise_pr(kit_qty=8, school_keys=("nalanda", "ranchi"))
	approve(pr)
	select(pr, quote(pr, "apex", 10400, 5, "QT-1040"))
	approve_payment(pr, 10400, "AES-INV-2215")
	pay(pr, 10400, "HDFCN52026101400")
	dc = dispatch(pr, "BD-779455")["delivery_challans"][0]
	as_user(
		"field",
		lambda: frappe.get_doc(
			{
				"doctype": "Delivery Discrepancy",
				"dc_number": dc,
				"item": items["paper"].name,
				"received_qty": 6,
				"action_taken": "Vendor notified; replacement requested",
			}
		).insert(),
	)
	prs["delivery"] = pr

	# Dispatch Pending.
	pr = raise_pr(item="geometry", qty=40, school_keys=("patna",))
	approve(pr)
	select(pr, quote(pr, "stem", 24400, 6, "QT-1052"))
	approve_payment(pr, 24400, "STM-0981")
	pay(pr, 24400, "HDFCN52026101800")
	prs["dispatch"] = pr

	# Payment Processing.
	pr = raise_pr(kit_qty=5, school_keys=("gaya",))
	approve(pr)
	select(pr, quote(pr, "apex", 6600, 7, "QT-1060"))
	approve_payment(pr, 6600, "AES-INV-2231")
	prs["payment"] = pr

	# Payment Approval Pending.
	pr = raise_pr(item="calculator", qty=12, school_keys=("ranchi",))
	approve(pr)
	select(pr, quote(pr, "bharat", 14400, 12, "QT-1066"))
	prs["payment_approval"] = pr

	# Vendor Selection — two quotes in.
	pr = raise_pr(kit_qty=6, school_keys=("patna", "nalanda"))
	approve(pr)
	quote(pr, "apex", 8100, 7, "QT-1071")
	quote(pr, "bharat", 8650, 9, "QT-1072")
	as_user("admin", api.close_quotation_collection, pr)
	prs["vendor_selection"] = pr

	# Quotation Collection — one quote so far.
	pr = raise_pr(item="slate", qty=30, school_keys=("gaya",))
	approve(pr)
	quote(pr, "bharat", 14400, 8, "QT-1080")
	prs["quotations"] = pr

	# Pending Approval (two), and one Rejected.
	prs["approval"] = raise_pr(kit_qty=10, school_keys=("ranchi", "gaya"), remarks="For the January intake.")
	prs["approval_item"] = raise_pr(item="paper", qty=80, school_keys=("patna",))
	pr = raise_pr(item="calculator", qty=50, school_keys=("nalanda",))
	as_user("manager", api.decide_purchase_requisition, pr, "reject", "Duplicate of an existing request.")
	prs["rejected"] = pr

	# --- inventory -----------------------------------------------------------
	transfer = as_user(
		"admin",
		api.submit_location_transfer,
		items["geometry"].name,
		"20",
		warehouses[0].name,
		warehouses[1].name,
		"Restock the Gaya field store",
	)
	as_user("admin", api.complete_location_transfer, transfer)
	as_user(
		"admin",
		api.submit_location_transfer,
		items["paper"].name,
		"15",
		warehouses[0].name,
		warehouses[1].name,
		"Ahead of the Gaya dispatch",
	)

	frappe.db.commit()
	return {
		"password": base.PASSWORD,
		"users": {key: base._email(key) for key in base.USERS} | {"norole": f"e2e-norole@{base.DOMAIN}"},
		"display_names": DISPLAY_NAMES,
		"prs": prs,
		"vendor": vendors["apex"].name,
		"school": schools["gaya"].name,
		"item": items["slate"].name,
		"kit": kit.name,
		"transfer": transfer,
	}
