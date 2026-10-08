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


# Reports — read-only aggregation endpoints.
# Currently backed by mock data. Replace the internals with real
# DocType/database aggregations later without changing the API contract.

_REPORT_ROLES = ALL_VISION_EMPOWER_ROLES + ["System Manager"]


@frappe.whitelist()
def get_procurement_summary_report(
    date_range: str = "",
    vendor: str = "",
    funder: str = "",
) -> dict:
    """Procurement summary — read-only report."""
    frappe.only_for(_REPORT_ROLES)

    return {
        "kpis": {
            "total_po_value": {
                "value": 1250000,
                "change": "+12.5%",
                "percent": 12.5,
            },
            "pending_payments": {
                "value": 285000,
                "change": "-8.2%",
                "percent": -8.2,
            },
            "avg_lead_time": {
                "value": 18,
                "change": "-2 days",
                "percent": -10.0,
            },
            "total_pos": {
                "value": 24,
                "change": "+4",
                "percent": 20.0,
            },
        },
        "top_vendor_spend": [
            {"vendor": "ABC Supplies", "amount": 420000},
            {"vendor": "Bright Education", "amount": 315000},
            {"vendor": "STEM Solutions", "amount": 275000},
            {"vendor": "Learning Resources", "amount": 240000},
        ],
        "vendor_transactions": [
            {
                "vendor": "ABC Supplies",
                "transactions": 8,
                "spend": 420000,
                "pending_payment": 95000,
            },
            {
                "vendor": "Bright Education",
                "transactions": 6,
                "spend": 315000,
                "pending_payment": 70000,
            },
            {
                "vendor": "STEM Solutions",
                "transactions": 5,
                "spend": 275000,
                "pending_payment": 65000,
            },
            {
                "vendor": "Learning Resources",
                "transactions": 5,
                "spend": 240000,
                "pending_payment": 55000,
            },
        ],
        "filters": {
            "date_range": date_range,
            "vendor": vendor,
            "funder": funder,
        },
    }


@frappe.whitelist()
def get_stock_status_report(
    category: str = "",
    warehouse: str = "",
) -> dict:
    """Stock status — read-only report."""
    frappe.only_for(_REPORT_ROLES)

    return {
        "kpis": {
            "items_in_hand": {
                "value": 18420,
                "change": "+6.4%",
                "percent": 6.4,
            },
            "below_reorder": {
                "value": 14,
                "change": "-3",
                "percent": -17.6,
            },
            "zero_stock": {
                "value": 5,
                "change": "-2",
                "percent": -28.6,
            },
            "never_dispatched": {
                "value": 9,
                "change": "-1",
                "percent": -10.0,
            },
        },
        "items": [
            {
                "item": "Braille Learning Kit",
                "category": "Braille",
                "warehouse": "Central Warehouse",
                "in_hand": 420,
                "reorder_level": 500,
                "status": "Below Reorder",
            },
            {
                "item": "STEM Activity Kit",
                "category": "STEM",
                "warehouse": "Central Warehouse",
                "in_hand": 850,
                "reorder_level": 400,
                "status": "Healthy",
            },
            {
                "item": "Audio Learning Device",
                "category": "IT",
                "warehouse": "Bangalore Warehouse",
                "in_hand": 0,
                "reorder_level": 100,
                "status": "Zero Stock",
            },
            {
                "item": "Science Lab Pack",
                "category": "Lab",
                "warehouse": "Central Warehouse",
                "in_hand": 125,
                "reorder_level": 100,
                "status": "Healthy",
            },
        ],
        "filters": {
            "category": category,
            "warehouse": warehouse,
        },
    }


@frappe.whitelist()
def get_dispatch_status_report(
    state: str = "",
    time_range: str = "",
) -> dict:
    """Dispatch status — read-only report."""
    frappe.only_for(_REPORT_ROLES)

    return {
        "kpis": {
            "total_dispatches": {
                "value": 186,
                "change": "+14.2%",
                "percent": 14.2,
            },
            "dispatched": {
                "value": 142,
                "change": "+18",
                "percent": 14.5,
            },
            "pending": {
                "value": 44,
                "change": "-6",
                "percent": -12.0,
            },
            "delivered": {
                "value": 128,
                "change": "+16",
                "percent": 14.3,
            },
        },
        "dispatch_status": [
            {"status": "Dispatched", "value": 142},
            {"status": "Pending", "value": 44},
        ],
        "schools": [
            {
                "school": "Government Higher Secondary School",
                "state": "Bihar",
                "dispatch_status": "Delivered",
                "dispatch_date": "2026-09-18",
                "delivery_date": "2026-09-23",
            },
            {
                "school": "Inclusive Learning School",
                "state": "Jharkhand",
                "dispatch_status": "In Transit",
                "dispatch_date": "2026-09-24",
                "delivery_date": None,
            },
            {
                "school": "Model School",
                "state": "Odisha",
                "dispatch_status": "Pending",
                "dispatch_date": None,
                "delivery_date": None,
            },
            {
                "school": "District Resource School",
                "state": "Bihar",
                "dispatch_status": "Delivered",
                "dispatch_date": "2026-09-15",
                "delivery_date": "2026-09-20",
            },
        ],
        "filters": {
            "state": state,
            "time_range": time_range,
        },
    }

@frappe.whitelist()
def submit_location_transfer(
    item: str, quantity: str, from_location: str, to_location: str, reason: str = ""
) -> str:
    """Submit a new Location Transfer."""
    frappe.only_for([ROLE_ADMIN, "System Manager"])

    doc = frappe.get_doc(
        {
            "doctype": "Location Transfer",
            "item": item,
            "quantity": int(quantity),
            "from_location": from_location,
            "to_location": to_location,
            "reason": reason,
            "approved_by": frappe.session.user,
            "status": "In Transit",
        }
    )
    doc.insert(ignore_permissions=True)
    return doc.name


@frappe.whitelist()
def list_location_transfers(filters: str = None) -> list[dict]:
    """List Location Transfers."""
    frappe.only_for(_REPORT_ROLES)
    
    parsed_filters = {}
    if filters:
        import json
        parsed_filters = json.loads(filters)

    return frappe.get_all(
        "Location Transfer",
        filters=parsed_filters,
        fields=[
            "name",
            "item",
            "quantity",
            "from_location",
            "to_location",
            "reason",
            "approved_by",
            "status",
            "creation"
        ],
        order_by="creation desc",
    )

@frappe.whitelist()
def bulk_import_csv(doctype: str) -> dict:
    """
    Generic endpoint to import a CSV into any Master Data table.
    Expects a multipart/form-data request with a 'file' containing the CSV.
    The CSV headers must exactly match the DocType fieldnames.
    """
    frappe.only_for([ROLE_ADMIN, "System Manager"])

    if not getattr(frappe.request, "files", None) or "file" not in frappe.request.files:
        frappe.throw("No CSV file uploaded. Please upload a file with the key 'file'.")

    uploaded_file = frappe.request.files["file"]
    
    import csv
    import io

    # Read and parse CSV
    try:
        file_content = uploaded_file.read().decode("utf-8")
        stream = io.StringIO(file_content)
        reader = csv.DictReader(stream)
    except Exception as e:
        frappe.throw(f"Failed to read CSV: {str(e)}")

    if not reader.fieldnames:
        frappe.throw("The uploaded CSV file is empty or missing headers.")

    imported = 0
    errors = []

    for idx, row in enumerate(reader, start=1):
        try:
            # Clean up keys and empty values
            cleaned_row = {
                k.strip(): (v.strip() if v.strip() else None)
                for k, v in row.items()
                if k and k.strip()
            }
            
            doc = frappe.new_doc(doctype)
            doc.update(cleaned_row)
            doc.insert(ignore_permissions=True)
            imported += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    if imported > 0:
        frappe.db.commit()

    return {
        "status": "success" if not errors else "partial_success" if imported > 0 else "failed",
        "imported": imported,
        "errors": errors,
    }
