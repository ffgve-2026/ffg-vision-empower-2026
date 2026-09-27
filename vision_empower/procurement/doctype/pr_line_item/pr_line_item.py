# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class PRLineItem(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		est_unit_cost: DF.Data
		item_id: DF.Link
		parent: DF.Data
		parentfield: DF.Data
		parenttype: DF.Data
		pr_line_id: DF.Data
		qty: DF.Int
	# end: auto-generated types

	pass
