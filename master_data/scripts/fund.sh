#!/bin/bash
set -e

cd ~/vision-empower/apps/master_data/master_data/master_data/doctype

# 1. Create folder structure
mkdir -p fund
cd fund
touch __init__.py

# 2. Create fund.json
cat > fund.json << 'EOF'
{
 "doctype": "DocType",
 "name": "Fund",
 "module": "Master Data",
 "custom": 0,
 "naming_rule": "By fieldname",
"autoname": "field:fund_id",
 "fields": [
  {"fieldname": "fund_id", "label": "Fund Id", "fieldtype": "Data", "reqd": 1, "unique": 1, "search_index": 1},
  {"fieldname": "fund_name", "label": "Fund Name", "fieldtype": "Data", "reqd": 1, "search_index": 1},
  {"fieldname": "funder", "label": "Funder", "fieldtype": "Link", "options": "Funder", "reqd": 1, "search_index": 1},
  {"fieldname": "program", "label": "Program", "fieldtype": "Data"},
  {"fieldname": "fiscal_year", "label": "Fiscal Year", "fieldtype": "Data", "search_index": 1},
  {"fieldname": "fund_type", "label": "Fund Type", "fieldtype": "Select", "options": "Grant\nCSR\nIndividual\nGovernment", "reqd": 1},
  {"fieldname": "sanctioned_amount", "label": "Sanctioned Amount", "fieldtype": "Currency", "default": "0"},
  {"fieldname": "released_amount", "label": "Released Amount", "fieldtype": "Currency", "default": "0"},
  {"fieldname": "reporting_frequency", "label": "Reporting Frequency", "fieldtype": "Data"},
  {"fieldname": "report_due_dates", "label": "Report Due Dates", "fieldtype": "Text"},
  {"fieldname": "programme_officer_name", "label": "Programme Officer Name", "fieldtype": "Data"},
  {"fieldname": "programme_officer_contact", "label": "Programme Officer Contact", "fieldtype": "Data"},
  {"fieldname": "restrictions", "label": "Restrictions", "fieldtype": "Text"},
  {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "Active\nClosed\nExhausted\nDraft", "default": "Draft", "search_index": 1},
  {"fieldname": "is_legacy_import", "label": "Is Legacy Import", "fieldtype": "Check", "default": "0"},
  {"fieldname": "source_sheet_ref", "label": "Source Sheet Ref", "fieldtype": "Data"},
  {"fieldname": "created_at", "label": "Created At", "fieldtype": "Datetime", "description": "Original creation timestamp, useful for legacy-imported records"}
 ],
 "permissions": [
  {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}
 ]
}
EOF

# 3. Create fund.py
cat > fund.py << 'EOF'
# Copyright (c) 2026, Your Name and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Fund(Document):
	pass
EOF

echo "Fund DocType files created."

# 3b. Update hooks.py to include Fund in fixtures
HOOKS_FILE=~/vision-empower/apps/master_data/master_data/hooks.py

if grep -q "fixtures" "$HOOKS_FILE"; then
    if ! grep -q '"Fund"' "$HOOKS_FILE"; then
        sed -i 's/fixtures = \[/fixtures = [\n    "Fund",/' "$HOOKS_FILE"
        echo "Added Fund to existing fixtures list."
    else
        echo "Fund already in fixtures list."
    fi
else
    echo '
fixtures = ["Funder", "Fund"]' >> "$HOOKS_FILE"
    echo "Created new fixtures list with Funder and Fund."
fi

echo "--- hooks.py fixtures section ---"
grep -A5 fixtures "$HOOKS_FILE"

# 4. Clear cache, then reload doc
cd ~/vision-empower
bench --site vision-empower.local clear-cache

echo "import frappe
frappe.reload_doc('master_data', 'doctype', 'fund', force=True)
frappe.db.commit()" | bench --site vision-empower.local console

# 5. Full migrate as a safety net
bench --site vision-empower.local migrate

echo "Done. Verifying schema..."
bench --site vision-empower.local mariadb -e "DESCRIBE tabFund;"
