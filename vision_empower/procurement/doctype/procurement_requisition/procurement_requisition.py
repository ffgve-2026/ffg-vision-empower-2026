# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class ProcurementRequisition(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		approved_amount: DF.Float
		approved_by: DF.SmallText | None
		approved_date: DF.Date | None
		budget_head: DF.SmallText | None
		fund_id: DF.Link | None
		pr_id: DF.SmallText
		requested_by: DF.SmallText | None
		requested_date: DF.Date | None
		required_by_date: DF.Date | None
		status: DF.SmallText | None
	# end: auto-generated types

	pass
