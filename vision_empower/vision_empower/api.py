# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

import frappe

# Mirrors config/roles.js's ROLES.
ROLE_FIELD_USER = "Vision Empower Field User"
ROLE_SENIOR_MANAGER = "Vision Empower Senior Manager"
ROLE_ADMIN = "Vision Empower Admin"
ROLE_FINANCE = "Vision Empower Finance"
ALL_VISION_EMPOWER_ROLES = [ROLE_FIELD_USER, ROLE_SENIOR_MANAGER, ROLE_ADMIN, ROLE_FINANCE]

# Which dashboard sections each role may receive. Mirrors
# config/dashboardWidgets.js's DASHBOARD_WIDGETS_BY_ROLE — that file only
# decides what the UI *renders*; this is the real security boundary, since
# a browser can never be trusted to withhold data on its own. All 4 roles
# currently see the same sections (real per-role content hasn't been
# specified yet); update both files together when it is.
DASHBOARD_SECTIONS_BY_ROLE = {
	ROLE_FIELD_USER: ["kpis", "reorder_alerts", "pending_approvals", "spend_trend"],
	ROLE_SENIOR_MANAGER: ["kpis", "reorder_alerts", "pending_approvals", "spend_trend"],
	ROLE_ADMIN: ["kpis", "reorder_alerts", "pending_approvals", "spend_trend"],
	ROLE_FINANCE: ["kpis", "reorder_alerts", "pending_approvals", "spend_trend"],
}

# Placeholder data — replace with real DocType-backed queries once Master
# Data / Purchase Requisition doctypes exist.
_DASHBOARD_DATA = {
	"kpis": {
		"total_po_value_this_month": {"value": "₹24,85,000", "change": "+12% vs last month"},
		"items_below_reorder": {"value": "18 Items", "note": "Critical Alert: Requires PR creation"},
		"schools_dispatched": {"value": "67% Complete", "percent": 67},
		"pending_payments": {"value": "₹8,42,000", "note": "Awaiting Funder Release"},
	},
	"reorder_alerts": [
		{"item": "First-Aid Kits (Grade A)", "min_level": 50, "units_left": 12, "unit": "units"},
		{"item": "Solar Lanterns (Heavy Duty)", "min_level": 30, "units_left": 5, "unit": "units"},
		{"item": "Primary Math Textbooks", "min_level": 100, "units_left": 45, "unit": "units"},
		{"item": "Water Purification Tablets", "min_level": 500, "units_left": 120, "unit": "packs"},
		{"item": "Eco Sanitary Napkins", "min_level": 200, "units_left": 80, "unit": "units"},
	],
	"pending_approvals": [
		{"pr": "PR-2024-089", "date": "12 Oct", "item": "Smart Classroom Projectors", "requested_by": "R. Sen"},
		{"pr": "PR-2024-090", "date": "13 Oct", "item": "Zinc Gluconate Supplements", "requested_by": "A. Patel"},
		{"pr": "PR-2024-091", "date": "14 Oct", "item": "Teacher Training Manuals", "requested_by": "K. Reddy"},
		{"pr": "PR-2024-092", "date": "14 Oct", "item": "Sports Gear Kit (Football)", "requested_by": "S. Khan"},
		{"pr": "PR-2024-093", "date": "15 Oct", "item": "Desktop Computers (Labs)", "requested_by": "R. Sen"},
	],
	"spend_trend": [
		{"month": "May", "amount": 1500000},
		{"month": "Jun", "amount": 1850000},
		{"month": "Jul", "amount": 1600000},
		{"month": "Aug", "amount": 2100000},
		{"month": "Sep", "amount": 2485000},
		{"month": "Oct", "amount": 2200000},
	],
}


def _sections_visible_to_caller() -> set[str]:
	if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles():
		return set(_DASHBOARD_DATA.keys())

	caller_roles = set(frappe.get_roles())
	visible: set[str] = set()
	for role, sections in DASHBOARD_SECTIONS_BY_ROLE.items():
		if role in caller_roles:
			visible.update(sections)
	return visible


@frappe.whitelist()
def get_dashboard_kpis() -> dict:
	"""Dashboard data, scoped to whichever sections the caller's role(s) may see.

	Client-side route guards (see public/js/vision_empower/router) and the
	widget-visibility config (config/dashboardWidgets.js) are UX only — this
	is the real security boundary, and it only returns sections the caller
	is actually permitted to see, not just an all-or-nothing endpoint gate.
	"""
	frappe.only_for(ALL_VISION_EMPOWER_ROLES + ["System Manager"])

	visible_sections = _sections_visible_to_caller()
	return {section: data for section, data in _DASHBOARD_DATA.items() if section in visible_sections}


# Purchase Requisition — steps 1 (Requisition) and 2 (Approval) only, per
# PR_STEP_ROLES in config/roles.js. No Purchase Requisition DocType exists
# yet, so these don't persist anything; they demonstrate the real,
# role-checked RBAC boundary for the eventual 8-step workflow. Replace with
# real DocType + Workflow logic once Master Data / PR doctypes are built.


@frappe.whitelist()
def submit_purchase_requisition(
	kit_type: str, quantity: str, target_schools: str, expected_delivery: str
) -> dict:
	"""Step 1 (Requisition) — only the Field User role may raise a request."""
	frappe.only_for([ROLE_FIELD_USER, "System Manager"])

	pr_id = f"PR-{frappe.utils.nowdate()[:4]}-{frappe.generate_hash(length=4).upper()}"

	return {
		"pr_id": pr_id,
		"item": kit_type,
		"requested_by": frappe.utils.get_fullname(frappe.session.user),
		"date": frappe.utils.format_date(frappe.utils.nowdate(), "dd MMM"),
		"quantity": quantity,
		"target_schools": target_schools,
		"expected_delivery": expected_delivery,
		"message": f"{pr_id} submitted for approval.",
	}


@frappe.whitelist()
def decide_purchase_requisition(pr_id: str, decision: str, remarks: str = "") -> dict:
	"""Step 2 (Approval) — only the Senior Manager role may approve/reject."""
	frappe.only_for([ROLE_SENIOR_MANAGER, "System Manager"])

	if decision not in ("approve", "reject"):
		frappe.throw("decision must be 'approve' or 'reject'")

	verb = "approved" if decision == "approve" else "rejected"
	return {
		"pr_id": pr_id,
		"decision": decision,
		"message": f"{pr_id} has been {verb}.",
	}
