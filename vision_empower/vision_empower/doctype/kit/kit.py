# Copyright (c) 2026, JPMC-VisionEmpower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Kit(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		from vision_empower.vision_empower.doctype.kit_item.kit_item import KitItem

		active: DF.Check
		description: DF.SmallText | None
		kit_code: DF.Data
		kit_items: DF.Table[KitItem]
		kit_name: DF.Data
		preferred_vendor: DF.Link | None
		target_school_type: DF.Literal["Govt", "Private"]
	# end: auto-generated types

	_DOCTYPE_NAME = "Kit"
