# Copyright (c) 2026, JPMC-VisionEmpower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Item(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		active: DF.Check
		category: DF.Literal["Books", "STEM", "CT", "Lab", "Braille", "IT", "AT"]
		item_name: DF.Data | None
		school_norm_qty: DF.Float
		unit: DF.Data | None
	# end: auto-generated types

	_DOCTYPE_NAME = "Item"
