import frappe


@frappe.whitelist()
def get_my_requested_procurement_requisitions():
    """Return procurement requisitions created/requested by the current user."""

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
def get_pr_by_name(pr_name):
    """Get a single Procurement Requisition by PR name."""

    if not pr_name:
        frappe.throw("PR name is required")

    if not frappe.db.exists("Procurement Requisition", pr_name):
        frappe.throw(f"Procurement Requisition {pr_name} not found")

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


@frappe.whitelist()
def save_procurement_requisition(data):
    """
    Create a new Procurement Requisition.

    pr_line_id is generated automatically by the server.
    The client/user must not provide it.
    """

    if isinstance(data, str):
        data = frappe.parse_json(data)

    # Create the parent PR
    pr = frappe.new_doc("Procurement Requisition")

    # Set parent fields
    pr.requested_by = frappe.session.user
    #pr.requested_by = data.get("requested_by")
    pr.requested_date = data.get("requested_date")
    pr.required_by_date = data.get("required_by_date")
    pr.fund_id = data.get("fund_id")
    pr.status = data.get("status") or "Draft"
    pr.budget_head = data.get("budget_head")
    pr.approved_amount = data.get("approved_amount") or 0

    # Add line items
    line_items = data.get("line_items", [])

    for sequence, item in enumerate(line_items, start=1):

        row = pr.append("line_items", {
            "item_id": item.get("item_id"),
            "qty": item.get("qty"),
            "estimated_unit_cost": item.get("estimated_unit_cost"),
        })

        # Server generates this.
        # User input is ignored.
        row.pr_line_id = sequence

    # Save the PR
    pr.insert()

    return {
        "success": True,
        "message": "Procurement Requisition created successfully",
        "data": {
            "name": pr.name,
            "requested_by": pr.requested_by,
            "status": pr.status,
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
        },
    }