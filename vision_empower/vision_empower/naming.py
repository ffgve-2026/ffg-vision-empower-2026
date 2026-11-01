import frappe
from frappe.model.naming import make_autoname


def next_free_id(doctype: str, series: str) -> str:
	"""Next ID from `series` (e.g. "FND-.###") that no record uses yet — the
	series counter starts at 0 on sites whose records were numbered by hand,
	so skip past any IDs already taken."""
	while True:
		candidate = make_autoname(series, doctype)
		if not frappe.db.exists(doctype, candidate):
			return candidate
