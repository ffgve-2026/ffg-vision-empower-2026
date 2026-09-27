# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Payment(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		amount: DF.Data
		invoice_id: DF.Link
		mode: DF.Data | None
		payment_date: DF.Date
		payment_id: DF.Data
		status: DF.Data | None
		utr_reference_number: DF.Data | None
		vendor_id: DF.Link
	# end: auto-generated types

	pass
