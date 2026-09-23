#!/bin/bash
set -e

cd ~/vision-empower/apps/master_data/master_data/master_data/doctype

# 1. Create folder structure
mkdir -p funder
cd funder
touch __init__.py

# 2. Create funder.json
cat > funder.json << 'EOF'
{
 "doctype": "DocType",
 "name": "Funder",
 "module": "Master Data",
 "custom": 0,
 "naming_rule": "By fieldname",
 "autoname": "field:funder_id",
 "fields": [
  {"fieldname": "funder_id", "label": "Funder Id", "fieldtype": "Data", "reqd": 1, "unique": 1, "search_index": 1},
  {"fieldname": "funder_name", "label": "Funder Name", "fieldtype": "Data", "reqd": 1, "search_index": 1},
  {"fieldname": "contact_person", "label": "Contact Person", "fieldtype": "Data"},
  {"fieldname": "email", "label": "Email", "fieldtype": "Data"},
  {"fieldname": "phone", "label": "Phone Number", "fieldtype": "Phone"},
  {"fieldname": "address", "label": "Address", "fieldtype": "Text"},
  {"fieldname": "active", "label": "Active", "fieldtype": "Check", "default": "1", "search_index": 1},
  {"fieldname": "is_legacy_import", "label": "Is Legacy Import", "fieldtype": "Check", "default": "0"},
  {"fieldname": "source_sheet_ref", "label": "Source Sheet Ref", "fieldtype": "Data"},
  {"fieldname": "created_at", "label": "Created At", "fieldtype": "Datetime", "description": "Original creation timestamp, useful for legacy-imported records"}
 ],
 "permissions": [
  {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}
 ]
}
EOF

# 3. Create funder.py
cat > funder.py << 'EOF'
# Copyright (c) 2026, Your Name and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Funder(Document):
	pass
EOF

echo "Funder DocType files created."

# 3b. Update hooks.py to include Funder in fixtures
HOOKS_FILE=~/vision-empower/apps/master_data/master_data/hooks.py

if grep -q "fixtures" "$HOOKS_FILE"; then
    if ! grep -q '"Funder"' "$HOOKS_FILE"; then
        sed -i 's/fixtures = \[/fixtures = [\n    "Funder",/' "$HOOKS_FILE"
        echo "Added Funder to existing fixtures list."
    else
        echo "Funder already in fixtures list."
    fi
else
    echo '
fixtures = ["Funder"]' >> "$HOOKS_FILE"
    echo "Created new fixtures list with Funder."
fi

echo "--- hooks.py fixtures section ---"
grep -A5 fixtures "$HOOKS_FILE"

# 4. Clear cache, then reload doc
cd ~/vision-empower
bench --site vision-empower.local clear-cache

echo "import frappe
frappe.reload_doc('master_data', 'doctype', 'funder', force=True)
frappe.db.commit()" | bench --site vision-empower.local console

# 5. Full migrate as a safety net
bench --site vision-empower.local migrate

echo "Done. Verifying schema..."
bench --site vision-empower.local mariadb -e "DESCRIBE tabFunder;"

