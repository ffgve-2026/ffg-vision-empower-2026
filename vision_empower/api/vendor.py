import frappe
from frappe import _


def _get_all_fields():
	meta = frappe.get_meta("Vendor")
	fields = [
		field.fieldname
		for field in meta.fields
		if field.fieldtype
		not in (
			"Section Break",
			"Column Break",
			"Tab Break",
			"HTML",
			"Button",
		)
	]
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
	if not isinstance(data, dict):
		frappe.throw(_("data must be a JSON object"))
	meta = frappe.get_meta("Vendor")
	allowed_fields = {field.fieldname for field in meta.fields}
	allowed_fields.update({"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"})
	invalid_fields = set(data) - allowed_fields
	if invalid_fields:
		frappe.throw(_("Invalid Vendor field(s): {0}").format(", ".join(sorted(invalid_fields))))


@frappe.whitelist()
def list_vendors():
	fields = _get_all_fields()
	docs = frappe.get_all("Vendor", fields=fields, order_by="modified desc")
	return {"count": len(docs), "data": docs}


@frappe.whitelist()
def get_vendor(name: str):
	fields = _get_all_fields()
	doc = frappe.db.get_value("Vendor", name, fields, as_dict=True)
	if not doc:
		frappe.throw(_("Vendor {0} not found").format(name), frappe.DoesNotExistError)
	return doc


@frappe.whitelist()
def create_vendor(data: str):
	data = frappe.parse_json(data)
	_validate_fields(data)
	doc = frappe.get_doc({"doctype": "Vendor", **data})
	doc.insert()
	return {"message": _("Vendor created successfully"), "data": doc.as_dict()}


@frappe.whitelist()
def update_vendor(name: str, data: str):
	data = frappe.parse_json(data)
	_validate_fields(data)
	doc = frappe.get_doc("Vendor", name)
	for field, value in data.items():
		if field != "name":
			doc.set(field, value)
	doc.save()
	return {"message": _("Vendor updated successfully"), "data": doc.as_dict()}


@frappe.whitelist()
def deactivate_vendor(name: str):
	if not frappe.db.exists("Vendor", name):
		frappe.throw(_("Vendor {0} not found").format(name), frappe.DoesNotExistError)
	doc = frappe.get_doc("Vendor", name)
	doc.active = 0
	doc.save()
	return {"message": _("Vendor deactivated successfully"), "name": name}
