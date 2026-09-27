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
    school: str,
    item: str,
    expected_qty: int,
    received_qty: int,
    action_taken: str | None = None,
):
    _require_role(FIELD_USER_ROLE)

    expected_qty = int(expected_qty)
    received_qty = int(received_qty)

    if not dc_number:
        frappe.throw("DC Number is required")

    if not school:
        frappe.throw("School is required")

    if not item:
        frappe.throw("Item is required")

    if expected_qty < 0:
        frappe.throw("Expected quantity cannot be negative")

    if received_qty < 0:
        frappe.throw("Received quantity cannot be negative")

    if received_qty > expected_qty:
        frappe.throw(
            "Received quantity cannot be greater than expected quantity"
        )

    discrepancy = frappe.get_doc(
        {
            "doctype": "Delivery Discrepancy",
            "dc_number": dc_number,
            "school": school,
            "item": item,
            "expected_qty": expected_qty,
            "received_qty": received_qty,
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
def list_delivery_discrepancies(filters: str | None = None):
    if not ALLOWED_LIST_ROLES.intersection(frappe.get_roles()):
        frappe.throw(
            "You do not have permission to perform this action",
            frappe.PermissionError,
        )

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

    return frappe.get_all(
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
            "creation",
            "modified",
        ],
        order_by="creation desc",
    )
