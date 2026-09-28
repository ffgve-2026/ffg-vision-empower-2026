# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class VendorInvoice(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		amount: DF.Data | None
		grn_id: DF.Link
		gst_amount: DF.Data | None
		invoice_date: DF.Date | None
		invoice_id: DF.Data
		invoice_number: DF.Data
		match_status: DF.Literal["Matched", "Discrepancy"]
		po_id: DF.Link
		vendor_id: DF.Link
	# end: auto-generated types

	pass
