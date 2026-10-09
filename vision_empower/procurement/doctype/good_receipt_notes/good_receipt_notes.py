# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class GoodReceiptNotes(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		challan_number: DF.Data | None
		condition: DF.Literal["Good", "Damaged", "Shortage"]
		grn_id: DF.Data
		invoice_number: DF.Data | None
		po_id: DF.Link
		received_by: DF.Data | None
		received_date: DF.Date | None
		status: DF.Data | None
		wh_id: DF.Link | None
	# end: auto-generated types

	def validate(self):
		self.grn_id = self.name
		for idx, row in enumerate(self.line_items, start=1):
			row.grn_line_id = f"{self.name}-{idx}"
