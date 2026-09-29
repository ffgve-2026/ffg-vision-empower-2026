# Copyright (c) 2026, JPMC-VisionEmpower and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Vendor(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		active: DF.Check
		address: DF.SmallText | None
		bank_account_number: DF.Data | None
		bank_name: DF.Data | None
		category: DF.Data | None
		city: DF.Data | None
		contact_person: DF.Data | None
		email: DF.Data | None
		gstin: DF.Data | None
		ifsc_code: DF.Data | None
		pan: DF.Data | None
		phone: DF.Data | None
		state: DF.Data | None
		vendor_name: DF.Data
	# end: auto-generated types

	_DOCTYPE_NAME = "Vendor"
