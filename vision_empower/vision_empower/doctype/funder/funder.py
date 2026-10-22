# Copyright (c) 2026, Your Name and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from vision_empower.vision_empower.naming import next_free_id


class Funder(Document):
	def autoname(self):
		# The ID can be typed in (legacy imports) or left blank to be numbered.
		self.funder_id = (self.funder_id or "").strip() or next_free_id("Funder", "FUND-.###")
		self.name = self.funder_id
