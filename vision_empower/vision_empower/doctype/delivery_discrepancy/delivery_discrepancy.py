# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DeliveryDiscrepancy(Document):
    def validate(self):
        dc = frappe.get_doc("Delivery Challan", self.dc_number)
        self.school = dc.school
        self.procurement_requisition = dc.procurement_requisition

        # Expected qty is what this challan sent for the item, not user input.
        sent = {row.item: row.qty for row in dc.items}
        if self.item not in sent:
            frappe.throw(f"Item {self.item} is not on {dc.name}")
        self.expected_qty = sent[self.item]

        if self.received_qty < 0:
            frappe.throw("Received quantity cannot be negative")

        if self.received_qty > self.expected_qty:
            frappe.throw(
                "Received quantity cannot be greater than expected quantity"
            )

        self.shortage = self.expected_qty - self.received_qty
