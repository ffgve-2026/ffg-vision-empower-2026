import frappe
from vision_empower.vision_empower.api import (
    submit_location_transfer,
    list_location_transfers,
    get_procurement_summary_report,
    get_stock_status_report,
    get_dispatch_status_report,
)
from vision_empower.api.delivery_discrepancy import (
    report_delivery_discrepancy,
    list_delivery_discrepancies,
)

def run_tests():
    frappe.set_user("Administrator")
    print("Testing get_procurement_summary_report...")
    print(get_procurement_summary_report())
    
    print("\nTesting get_stock_status_report...")
    print(get_stock_status_report())
    
    print("\nTesting get_dispatch_status_report...")
    print(get_dispatch_status_report())
    
    print("\nTesting list_location_transfers...")
    print(list_location_transfers())
    
    print("\nTesting list_delivery_discrepancies...")
    print(list_delivery_discrepancies())
    
    print("\n✅ All read-only and report APIs executed successfully!")
