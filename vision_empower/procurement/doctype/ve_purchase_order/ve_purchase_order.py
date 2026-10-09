# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
from frappe.utils import flt


class VEPurchaseOrder(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		expected_del_date: DF.Date | None
		fund_id: DF.Link
		order_date: DF.Date
		po_id: DF.Data
		pr_ids: DF.Link
		status: DF.Literal[
			"Draft", "Pending Approval", "Approved", "Ordered", "Received", "Rejected", "Cancelled"
		]
		total_amount: DF.Float
		vendor_ack_date: DF.Date | None
		vendor_delivery_date: DF.Date | None
		vendor_id: DF.Link
	# end: auto-generated types

	def validate(self):
		# po_id predates the naming series — keep it mirroring the name.
		self.po_id = self.name
		for idx, row in enumerate(self.line_items, start=1):
			row.po_id = self.name
			row.po_line_id = f"{self.name}-{idx}"
			row.line_total = flt(row.qty) * flt(row.unit_price)
