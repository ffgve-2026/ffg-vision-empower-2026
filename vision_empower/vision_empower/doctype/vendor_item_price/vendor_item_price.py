# Copyright (c) 2026, JPMC-VisionEmpower and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import formatdate


class VendorItemPrice(Document):
	_DOCTYPE_NAME = "Vendor Item Price"

	def validate(self):
		# One price per vendor, item and effective date — a second one would
		# leave it ambiguous which price PR estimates and POs pick up. A new
		# price goes in with a new effective date (or edit the existing one).
		duplicate = frappe.db.exists(
			"Vendor Item Price",
			{
				"vendor": self.vendor,
				"item": self.item,
				"effective_date": self.effective_date,
				"name": ("!=", self.name or ""),
			},
		)
		if duplicate:
			frappe.throw(
				_("{0} already has a price for {1} effective {2}. Edit that price instead.").format(
					frappe.db.get_value("Vendor", self.vendor, "vendor_name") or self.vendor,
					frappe.db.get_value("Item", self.item, "item_name") or self.item,
					formatdate(self.effective_date),
				),
				frappe.DuplicateEntryError,
			)
