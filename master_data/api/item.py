import frappe


def _get_all_item_fields():
    """Return all Item fields, including standard Frappe fields."""
    meta = frappe.get_meta("Item")

    fields = [
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

    # Include standard Frappe document fields.
    standard_fields = [
        "name",
        "owner",
        "creation",
        "modified",
        "modified_by",
        "docstatus",
        "idx",
    ]

    return list(dict.fromkeys(standard_fields + fields))


def _validate_fields(data):
    """Validate that supplied fields exist on Item."""
    if not isinstance(data, dict):
        frappe.throw("data must be a JSON object")

    meta = frappe.get_meta("Item")

    allowed_fields = {
        field.fieldname
        for field in meta.fields
    }

    allowed_fields.update(
        {
            "name",
            "owner",
            "creation",
            "modified",
            "modified_by",
            "docstatus",
            "idx",
        }
    )

    invalid_fields = set(data) - allowed_fields

    if invalid_fields:
        frappe.throw(
            "Invalid Item field(s): "
            + ", ".join(sorted(invalid_fields))
        )


@frappe.whitelist()
def get_items():
    """Return all Item records with all available attributes."""

    fields = _get_all_item_fields()

    items = frappe.get_all(
        "Item",
        fields=fields,
        order_by="modified desc",
    )

    return {
        "count": len(items),
        "data": items,
    }


@frappe.whitelist()
def get_item(name):
    """Return a single Item with all available attributes."""

    fields = _get_all_item_fields()

    item = frappe.db.get_value(
        "Item",
        name,
        fields,
        as_dict=True,
    )

    if not item:
        frappe.throw(
            f"Item '{name}' not found",
            frappe.DoesNotExistError,
        )

    return item


@frappe.whitelist()
def create_item(data):
    """Create a new Item."""

    data = frappe.parse_json(data)

    _validate_fields(data)

    doc = frappe.get_doc(
        {
            "doctype": "Item",
            **data,
        }
    )

    doc.insert()

    return {
        "message": "Item created successfully",
        "data": doc.as_dict(),
    }


@frappe.whitelist()
def update_item(name, data):
    """Update an existing Item."""

    data = frappe.parse_json(data)

    _validate_fields(data)

    doc = frappe.get_doc("Item", name)

    for field, value in data.items():
        if field != "name":
            doc.set(field, value)

    doc.save()

    return {
        "message": "Item updated successfully",
        "data": doc.as_dict(),
    }


@frappe.whitelist()
def delete_item(name):
    """Delete an Item."""

    if not frappe.db.exists("Item", name):
        frappe.throw(
            f"Item '{name}' not found",
            frappe.DoesNotExistError,
        )

    frappe.delete_doc("Item", name)

    return {
        "message": "Item deleted successfully",
        "name": name,
    }
