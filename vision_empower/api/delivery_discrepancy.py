# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

import frappe


FIELD_USER_ROLE = "Vision Empower Field User"
ALLOWED_LIST_ROLES = {
    "Vision Empower Field User",
    "Vision Empower Senior Manager",
    "Vision Empower Admin",
    "Vision Empower Finance",
    "System Manager",
}


def _require_role(role):
    if role not in frappe.get_roles():
        frappe.throw(
            "You do not have permission to perform this action",
            frappe.PermissionError,
        )


@frappe.whitelist()
def report_delivery_discrepancy(
    dc_number: str,
    item: str,
    received_qty: int,
    action_taken: str | None = None,
):
    """Report a shortage against one item on a Delivery Challan. School and
    expected qty come from the challan (see DeliveryDiscrepancy.validate)."""
    _require_role(FIELD_USER_ROLE)

    if not dc_number:
        frappe.throw("Delivery Challan is required")

    if not item:
        frappe.throw("Item is required")

    discrepancy = frappe.get_doc(
        {
            "doctype": "Delivery Discrepancy",
            "dc_number": dc_number,
            "item": item,
            "received_qty": int(received_qty),
            "action_taken": action_taken,
        }
    )

    discrepancy.insert()

    return {
        "name": discrepancy.name,
        "dc_number": discrepancy.dc_number,
        "school": discrepancy.school,
        "item": discrepancy.item,
        "expected_qty": discrepancy.expected_qty,
        "received_qty": discrepancy.received_qty,
        "shortage": discrepancy.shortage,
        "action_taken": discrepancy.action_taken,
    }


@frappe.whitelist()
def list_challans_for_discrepancy() -> list[dict]:
    """Delivery Challans a discrepancy can be reported against, with the
    items each one carried — feeds the report form's dropdowns."""
    _require_any_role()

    challans = frappe.get_all(
        "Delivery Challan",
        fields=["name", "school", "dispatch_date", "status", "procurement_requisition"],
        order_by="dispatch_date desc",
    )
    for dc in challans:
        dc["school_name"] = frappe.db.get_value("School", dc.school, "school_name") if dc.school else ""
        dc["items"] = [
            {
                "item": row.item,
                "item_name": frappe.db.get_value("Item", row.item, "item_name"),
                "qty": row.qty,
            }
            for row in frappe.get_all(
                "Delivery Challan Item",
                filters={"parent": dc.name, "parenttype": "Delivery Challan"},
                fields=["item", "qty"],
                order_by="idx asc",
            )
        ]
    return challans


def _require_any_role():
    if not ALLOWED_LIST_ROLES.intersection(frappe.get_roles()):
        frappe.throw(
            "You do not have permission to perform this action",
            frappe.PermissionError,
        )


@frappe.whitelist()
def list_delivery_discrepancies(filters: str | None = None):
    _require_any_role()

    filters = frappe.parse_json(filters) if filters else {}

    allowed_fields = {
        "name",
        "dc_number",
        "school",
        "item",
    }

    filters = {
        key: value
        for key, value in filters.items()
        if key in allowed_fields
    }

    rows = frappe.get_all(
        "Delivery Discrepancy",
        filters=filters,
        fields=[
            "name",
            "dc_number",
            "school",
            "item",
            "expected_qty",
            "received_qty",
            "shortage",
            "action_taken",
            "procurement_requisition",
            "creation",
            "modified",
        ],
        order_by="creation desc",
    )
    for row in rows:
        row["school_name"] = frappe.db.get_value("School", row.school, "school_name") if row.school else ""
        row["item_name"] = frappe.db.get_value("Item", row.item, "item_name") or row.item
    return rows
