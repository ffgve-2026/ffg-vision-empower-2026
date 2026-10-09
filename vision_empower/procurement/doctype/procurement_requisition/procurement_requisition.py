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

		from vision_empower.procurement.doctype.pr_line_item.pr_line_item import PRLineItem

		approved_amount: DF.Float
		approved_by: DF.Data | None
		approved_date: DF.Date | None
		budget_head: DF.Data | None
		fund_id: DF.Link | None
		line_items: DF.Table[PRLineItem]
		requested_by: DF.Data | None
		requested_date: DF.Date | None
		required_by_date: DF.Date | None
		status: DF.Literal[
			"Draft", "Pending Approval", "Approved", "Ordered", "Received", "Rejected", "Cancelled"
		]
	# end: auto-generated types

	pass
