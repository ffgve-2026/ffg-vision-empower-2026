# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class POLineItem(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		item_id: DF.Link
		line_total: DF.Float
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		po_id: DF.Link
		po_line_id: DF.Data
		qty: DF.Int
		unit_price: DF.Data | None
	# end: auto-generated types

	pass
