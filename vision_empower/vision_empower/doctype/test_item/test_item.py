# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class TestItem(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		description: DF.Text | None
	# end: auto-generated types

	_DOCTYPE_NAME = "Test Item"
