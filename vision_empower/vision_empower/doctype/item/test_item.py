# Copyright (c) 2026, JPMC-VisionEmpower and Contributors
# See license.txt

# import frappe
from frappe.tests import IntegrationTestCase

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []


class IntegrationTestItem(IntegrationTestCase):
	"""
	Integration tests for Item.
	"""

	def test_dummy(self):
		self.assertTrue(True)
