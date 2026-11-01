# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

RESOLUTION_FIELDS = ("status", "resolution", "resolved_by", "resolved_on")


class DeliveryDiscrepancy(Document):
	def validate(self):
		# Only resolve_delivery_discrepancy may close one; Field Users can
		# write this doctype, so ignore resolution values sent any other way.
		if not self.flags.resolving:
			before = self.get_doc_before_save()
			for field in RESOLUTION_FIELDS:
				self.set(field, before.get(field) if before else None)
		self.status = self.status or "Open"

		dc = frappe.get_doc("Delivery Challan", self.dc_number)
		self.school = dc.school
		self.procurement_requisition = dc.procurement_requisition

		# Expected qty is what this challan sent for the item, not user input.
		sent = {row.item: row.qty for row in dc.items}
		if self.item not in sent:
			frappe.throw(_("Item {0} is not on {1}").format(self.item, dc.name))
		self.expected_qty = sent[self.item]

		if self.received_qty < 0:
			frappe.throw(_("Received quantity cannot be negative"))

		if self.received_qty > self.expected_qty:
			frappe.throw(_("Received quantity cannot be greater than expected quantity"))

		self.shortage = self.expected_qty - self.received_qty

	def after_insert(self):
		# A shortage reported after the challan was confirmed corrects it:
		# the item's received qty, and "Good" becomes "Shortage".
		dc = frappe.get_doc("Delivery Challan", self.dc_number)
		if dc.status != "Delivered":
			return
		for row in dc.items:
			if row.item == self.item and (row.received_qty is None or row.received_qty > self.received_qty):
				row.db_set("received_qty", self.received_qty)
		if dc.condition in (None, "", "Good"):
			dc.db_set("condition", "Shortage")
