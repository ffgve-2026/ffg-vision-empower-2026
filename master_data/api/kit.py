import frappe


def _get_all_fields():
	meta = frappe.get_meta("Kit")
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
		frappe.throw("data must be a JSON object")
	meta = frappe.get_meta("Kit")
	allowed_fields = {field.fieldname for field in meta.fields}
	allowed_fields.update({"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"})
	invalid_fields = set(data) - allowed_fields
	if invalid_fields:
		frappe.throw("Invalid Kit field(s): " + ", ".join(sorted(invalid_fields)))


@frappe.whitelist()
def list_kits():
	fields = _get_all_fields()
	docs = frappe.get_all("Kit", fields=fields, order_by="modified desc")
	return {"count": len(docs), "data": docs}


@frappe.whitelist()
def get_kit(name):
	fields = _get_all_fields()
	doc = frappe.db.get_value("Kit", name, fields, as_dict=True)
	if not doc:
		frappe.throw(f"Kit '{name}' not found", frappe.DoesNotExistError)
	return doc


@frappe.whitelist()
def create_kit(data):
	data = frappe.parse_json(data)
	_validate_fields(data)
	doc = frappe.get_doc({"doctype": "Kit", **data})
	doc.insert()
	return {"message": "Kit created successfully", "data": doc.as_dict()}


@frappe.whitelist()
def update_kit(name, data):
	data = frappe.parse_json(data)
	_validate_fields(data)
	doc = frappe.get_doc("Kit", name)
	for field, value in data.items():
		if field != "name":
			doc.set(field, value)
	doc.save()
	return {"message": "Kit updated successfully", "data": doc.as_dict()}


@frappe.whitelist()
def delete_kit(name):
	if not frappe.db.exists("Kit", name):
		frappe.throw(f"Kit '{name}' not found", frappe.DoesNotExistError)
	frappe.delete_doc("Kit", name)
	return {"message": "Kit deleted successfully", "name": name}
