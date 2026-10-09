import frappe
from frappe import _

ALL_VE_ROLES = [
	"Vision Empower Field User",
	"Vision Empower Senior Manager",
	"Vision Empower Admin",
	"Vision Empower Finance",
	"System Manager",
]


@frappe.whitelist()
def get_my_requested_procurement_requisitions():
	"""Return procurement requisitions created/requested by the current user."""
	frappe.only_for(ALL_VE_ROLES)

	user = frappe.session.user

	prs = frappe.get_all(
		"Procurement Requisition",
		filters={
			"requested_by": user,
		},
		fields=[
			"name",
			"requested_by",
			"requested_date",
			"required_by_date",
			"fund_id",
			"status",
			"approved_by",
			"approved_date",
			"budget_head",
			"approved_amount",
		],
		order_by="creation desc",
	)

	for pr in prs:
		pr["line_items"] = frappe.get_all(
			"PR Line Item",
			filters={
				"parent": pr["name"],
				"parenttype": "Procurement Requisition",
				"parentfield": "line_items",
			},
			fields=[
				"pr_line_id",
				"item_id",
				"qty",
				"estimated_unit_cost",
			],
			order_by="idx asc",
		)

	return prs


@frappe.whitelist()
def list_procurement_requisitions():
	"""Return All procurement requisitions."""
	frappe.only_for(ALL_VE_ROLES)

	prs = frappe.get_all(
		"Procurement Requisition",
		fields=[
			"name",
			"requested_by",
			"requested_date",
			"required_by_date",
			"fund_id",
			"status",
			"approved_by",
			"approved_date",
			"budget_head",
			"approved_amount",
		],
		order_by="creation desc",
	)

	for pr in prs:
		pr["line_items"] = frappe.get_all(
			"PR Line Item",
			filters={
				"parent": pr["name"],
				"parenttype": "Procurement Requisition",
				"parentfield": "line_items",
			},
			fields=[
				"pr_line_id",
				"item_id",
				"qty",
				"estimated_unit_cost",
			],
			order_by="idx asc",
		)

	return prs


@frappe.whitelist()
def get_pr_by_name(pr_name: str):
	"""Get a single Procurement Requisition by PR name."""
	frappe.only_for(ALL_VE_ROLES)

	if not pr_name:
		frappe.throw(_("PR name is required"))

	if not frappe.db.exists("Procurement Requisition", pr_name):
		frappe.throw(_("Procurement Requisition {0} not found").format(pr_name))

	pr = frappe.get_doc("Procurement Requisition", pr_name)

	return {
		"name": pr.name,
		"requested_by": pr.requested_by,
		"requested_date": pr.requested_date,
		"required_by_date": pr.required_by_date,
		"fund_id": pr.fund_id,
		"status": pr.status,
		"approved_by": pr.approved_by,
		"approved_date": pr.approved_date,
		"budget_head": pr.budget_head,
		"approved_amount": pr.approved_amount,
		"line_items": [
			{
				"name": row.name,
				"pr_line_id": row.pr_line_id,
				"item_id": row.item_id,
				"qty": row.qty,
				"estimated_unit_cost": row.estimated_unit_cost,
			}
			for row in pr.line_items
		],
	}


# PR creation lives in vision_empower.vision_empower.api.submit_purchase_requisition
# (step 1 of the 8-step workflow), which also sets the workflow stage and
# logs the audit trail. Don't add a second create path here.
