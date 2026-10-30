# Copyright (c) 2026, Your Name and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from vision_empower.vision_empower.naming import next_free_id


class Fund(Document):
	def autoname(self):
		# The ID can be typed in (legacy imports) or left blank to be numbered.
		self.fund_id = (self.fund_id or "").strip() or next_free_id("Fund", "FND-.###")
		self.name = self.fund_id
