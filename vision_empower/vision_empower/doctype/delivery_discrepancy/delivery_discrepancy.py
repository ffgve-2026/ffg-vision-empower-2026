# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DeliveryDiscrepancy(Document):
    def validate(self):
        if self.expected_qty < 0:
            frappe.throw("Expected quantity cannot be negative")

        if self.received_qty < 0:
            frappe.throw("Received quantity cannot be negative")

        if self.received_qty > self.expected_qty:
            frappe.throw(
                "Received quantity cannot be greater than expected quantity"
            )

        self.shortage = self.expected_qty - self.received_qty
