# Copyright (c) 2026, JPMC-VisionEmpower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class School(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		active: DF.Check
		address: DF.SmallText | None
		city: DF.Data | None
		contact_email: DF.Data | None
		contact_person: DF.Data | None
		contact_phone: DF.Data | None
		district: DF.Data | None
		pincode: DF.Data | None
		school_code: DF.Data
		school_name: DF.Data
		school_type: DF.Literal["Govt", "Private"]
		state: DF.Data | None
		student_count: DF.Int
		students_with_disabilities: DF.Int
	# end: auto-generated types

	_DOCTYPE_NAME = "School"
