import frappe


def _get_all_vendor_fields():
    """Return all database-backed fields defined on Vendor."""
    meta = frappe.get_meta("Vendor")

    return [
        field.fieldname
        for field in meta.fields
        if field.fieldtype not in (
            "Section Break",
            "Column Break",
            "Tab Break",
            "HTML",
            "Button",
        )
    ]


@frappe.whitelist()
def get_vendors():
    """Return all Vendor records with all available attributes."""
    fields = _get_all_vendor_fields()

    vendors = frappe.get_all(
        "Vendor",
        fields=fields,
        order_by="modified desc",
    )

    return {
        "count": len(vendors),
        "data": vendors,
    }


@frappe.whitelist()
def get_vendor(name):
    """Return a single Vendor with all available attributes."""
    fields = _get_all_vendor_fields()

    vendor = frappe.db.get_value(
        "Vendor",
        name,
        fields,
        as_dict=True,
    )

    if not vendor:
        frappe.throw(
            f"Vendor '{name}' not found",
            frappe.DoesNotExistError,
        )

    return vendor


@frappe.whitelist()
def create_vendor(data):
    """Create a new Vendor."""
    data = frappe.parse_json(data)

    doc = frappe.get_doc({
        "doctype": "Vendor",
        **data,
    })

    doc.insert()

    return {
        "message": "Vendor created successfully",
        "data": doc.as_dict(),
    }


@frappe.whitelist()
def update_vendor(name, data):
    """Update an existing Vendor."""
    data = frappe.parse_json(data)

    doc = frappe.get_doc("Vendor", name)

    for field, value in data.items():
        if field != "name":
            doc.set(field, value)

    doc.save()

    return {
        "message": "Vendor updated successfully",
        "data": doc.as_dict(),
    }


@frappe.whitelist()
def delete_vendor(name):
    """Delete a Vendor."""
    if not frappe.db.exists("Vendor", name):
        frappe.throw(
            f"Vendor '{name}' not found",
            frappe.DoesNotExistError,
        )

    frappe.delete_doc("Vendor", name)

    return {
        "message": "Vendor deleted successfully",
        "name": name,
    }
