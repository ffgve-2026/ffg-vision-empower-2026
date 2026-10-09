# Copyright (c) 2026, Vision Empower and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import cint, flt

# Mirrors config/roles.js's ROLES.
ROLE_FIELD_USER = "Vision Empower Field User"
ROLE_SENIOR_MANAGER = "Vision Empower Senior Manager"
ROLE_ADMIN = "Vision Empower Admin"
ROLE_FINANCE = "Vision Empower Finance"
ALL_VISION_EMPOWER_ROLES = [ROLE_FIELD_USER, ROLE_SENIOR_MANAGER, ROLE_ADMIN, ROLE_FINANCE]

# Per-role dashboard layout, inferred from each role's actual
# responsibilities (see CLAUDE.md) since an exact per-widget spec hasn't
# been given yet. Mirrors config/dashboardWidgets.js's
# DASHBOARD_LAYOUT_BY_ROLE — that file only decides what the UI *renders*;
# this is the real security boundary, since a browser can never be trusted
# to withhold data on its own. Update both files together if the layout
# changes.
DASHBOARD_LAYOUT_BY_ROLE = {
	ROLE_FIELD_USER: {
		"kpis": ["items_below_reorder", "schools_dispatched"],
		"sections": ["reorder_alerts", "my_requisitions"],
	},
	ROLE_SENIOR_MANAGER: {
		"kpis": ["total_po_value_this_month", "items_below_reorder", "schools_dispatched"],
		"sections": ["reorder_alerts", "pending_approvals", "spend_trend"],
	},
	ROLE_ADMIN: {
		"kpis": ["total_po_value_this_month", "items_below_reorder"],
		"sections": ["reorder_alerts", "vendor_quotations", "spend_trend"],
	},
	ROLE_FINANCE: {
		"kpis": ["total_po_value_this_month", "pending_payments"],
		"sections": ["payments_queue", "spend_trend"],
	},
}


ALL_ROLES_AND_SYSTEM_MANAGER = [*ALL_VISION_EMPOWER_ROLES, "System Manager"]


def _layout_visible_to_caller() -> dict:
	if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles():
		return {
			"kpis": [kpi for layout in DASHBOARD_LAYOUT_BY_ROLE.values() for kpi in layout["kpis"]],
			"sections": [s for layout in DASHBOARD_LAYOUT_BY_ROLE.values() for s in layout["sections"]],
		}

	caller_roles = set(frappe.get_roles())
	kpis: set[str] = set()
	sections: set[str] = set()
	for role, layout in DASHBOARD_LAYOUT_BY_ROLE.items():
		if role in caller_roles:
			kpis.update(layout["kpis"])
			sections.update(layout["sections"])
	return {"kpis": list(kpis), "sections": list(sections)}


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _inr(amount) -> str:
	"""₹ with Indian digit grouping (₹24,85,000), no decimals."""
	amount = round(flt(amount))
	sign = "-" if amount < 0 else ""
	digits = str(abs(amount))
	if len(digits) > 3:
		head, tail = digits[:-3], digits[-3:]
		groups = []
		while len(head) > 2:
			groups.insert(0, head[-2:])
			head = head[:-2]
		if head:
			groups.insert(0, head)
		digits = ",".join(groups) + "," + tail
	return f"{sign}₹{digits}"


def _short_date(value) -> str:
	return frappe.utils.formatdate(value, "dd MMM") if value else ""


def _attach_file(file_url: str, doctype: str, name: str) -> str | None:
	"""Attach a file the browser already uploaded via /api/method/upload_file.

	Uploads go up unattached (the caller often can't write the target
	record), so the stage endpoint links the File here, after its own role
	check. Attaching it means the private file is readable by anyone who can
	read the record.
	"""
	if not file_url:
		return None
	file_name = frappe.db.get_value(
		"File",
		{"file_url": file_url, "owner": frappe.session.user},
		"name",
		order_by="creation desc",
	)
	if not file_name:
		frappe.throw(_("Uploaded file {0} not found.").format(file_url))
	frappe.db.set_value(
		"File",
		file_name,
		{"attached_to_doctype": doctype, "attached_to_name": name},
		update_modified=False,
	)
	return file_url


# ---------------------------------------------------------------------------
# Procurement Requisition workflow (8 steps)
#
# Each step writes to the doctype that owns that stage of the process:
#   1 Requisition        -> Procurement Requisition (+ PR Line Items)
#   2 Approval           -> Procurement Requisition
#   3 Quotations         -> Vendor Quotation
#   4 Vendor Selection   -> VE Purchase Order (+ PO Line Items)
#   5 Payment Approval   -> Vendor Invoice
#   6 Payment            -> Payment
#   7 Dispatch           -> Delivery Challan (one per target school)
#   8 Delivery           -> Good Receipt Notes (+ GRN Line Items)
# The PR's workflow_stage tracks which step is awaiting action, and its
# PR Activity table is the audit trail every step appends to.
# ---------------------------------------------------------------------------

STAGE_DRAFT = "Draft"
STAGE_APPROVAL = "Pending Approval"
STAGE_QUOTATIONS = "Quotation Collection"
STAGE_VENDOR_SELECTION = "Vendor Selection"
STAGE_PAYMENT_APPROVAL = "Payment Approval Pending"
STAGE_PAYMENT = "Payment Processing"
STAGE_DISPATCH = "Dispatch Pending"
STAGE_DELIVERY = "Delivery Pending"
STAGE_COMPLETED = "Completed"
STAGE_REJECTED = "Rejected"

# workflow_stage -> the stage id the frontend uses (ProcurementPipeline.vue,
# PurchaseRequisitionDetail.vue's STAGE_ORDER).
STAGE_IDS = {
	STAGE_DRAFT: "requisition",
	STAGE_APPROVAL: "approval",
	STAGE_QUOTATIONS: "quotations",
	STAGE_VENDOR_SELECTION: "vendor-selection",
	STAGE_PAYMENT_APPROVAL: "payment-approval",
	STAGE_PAYMENT: "payment",
	STAGE_DISPATCH: "dispatch",
	STAGE_DELIVERY: "delivery",
	STAGE_COMPLETED: "completed",
	STAGE_REJECTED: "rejected",
}

# Activity rows are logged against the step that was acted on, by step id.
STEP_LABELS = {
	"requisition": "Requisition",
	"approval": "Approval",
	"quotations": "Quotation Collection",
	"vendor-selection": "Vendor Selection",
	"payment-approval": "Payment Approval",
	"payment": "Payment Processing",
	"dispatch": "Dispatch",
	"delivery": "Delivery Confirmation",
}
STEP_IDS_BY_LABEL = {label: step for step, label in STEP_LABELS.items()}

# Stages at/after which the PR's goods count as procured stock (paid for).
PAID_STAGES = (STAGE_DISPATCH, STAGE_DELIVERY, STAGE_COMPLETED)
OPEN_STAGES = (
	STAGE_APPROVAL,
	STAGE_QUOTATIONS,
	STAGE_VENDOR_SELECTION,
	STAGE_PAYMENT_APPROVAL,
	STAGE_PAYMENT,
	STAGE_DISPATCH,
	STAGE_DELIVERY,
)


def _get_pr(pr_id: str):
	if not pr_id or not frappe.db.exists("Procurement Requisition", pr_id):
		frappe.throw(_("Procurement Requisition {0} not found").format(pr_id), frappe.DoesNotExistError)
	return frappe.get_doc("Procurement Requisition", pr_id)


def _require_stage(pr, *stages: str):
	if pr.workflow_stage not in stages:
		frappe.throw(
			_("{0} is at '{1}', so this step can't be performed now.").format(pr.name, pr.workflow_stage)
		)


def _log(pr, step: str, action: str, remarks: str = "", attachment: str | None = None):
	pr.append(
		"activity",
		{
			"stage": STEP_LABELS[step],
			"action": action,
			"performed_by": frappe.session.user,
			"performed_at": frappe.utils.now_datetime(),
			"remarks": remarks,
			"attachment": attachment,
		},
	)


def _save_pr(pr):
	# Stage endpoints run their own only_for() check; the acting role (e.g.
	# Finance) generally has no write permission on the PR itself.
	pr.flags.ignore_permissions = True
	pr.save()


def _pr_item_label(pr) -> str:
	if pr.get("kit"):
		return frappe.db.get_value("Kit", pr.kit, "kit_name") or pr.kit
	names = [frappe.db.get_value("Item", row.item_id, "item_name") or row.item_id for row in pr.line_items]
	if not names:
		return ""
	return names[0] if len(names) == 1 else f"{names[0]} +{len(names) - 1} more"


def _pr_estimated_value(pr) -> float:
	return sum(flt(row.qty) * flt(row.estimated_unit_cost) for row in pr.line_items)


def _pr_summary(pr) -> dict:
	return {
		"pr": pr.name,
		"item": _pr_item_label(pr),
		"stage": STAGE_IDS.get(pr.workflow_stage, "requisition"),
		"stage_label": pr.workflow_stage,
		"requested_by": frappe.utils.get_fullname(pr.requested_by) if pr.requested_by else "",
		"date": _short_date(pr.requested_date),
		"quantity": pr.request_qty,
		"estimated_value": _pr_estimated_value(pr),
	}


def _latest_unit_price(item: str, vendor: str | None = None) -> float:
	filters = {"item": item}
	if vendor:
		filters["vendor"] = vendor
	return flt(
		frappe.db.get_value("Vendor Item Price", filters, "unit_price", order_by="effective_date desc")
	)


def _split_evenly(total: int, parts: int) -> list[int]:
	"""Split `total` into `parts` integers, remainder going to the first ones."""
	base, extra = divmod(int(total), parts)
	return [base + (1 if i < extra else 0) for i in range(parts)]


@frappe.whitelist()
def submit_purchase_requisition(
	quantity: str,
	expected_delivery: str,
	kit_type: str = "",
	item_type: str = "",
	target_schools: str = "",
	fund: str = "",
	remarks: str = "",
) -> dict:
	"""Step 1 (Requisition) — only the Field User role may raise a request.

	A request is for exactly one Kit *or* one individual Item (`kit_type` /
	`item_type` are their record names). A Kit request is expanded into one
	PR Line Item per Kit Item, scaled by `quantity`. `target_schools` is a
	JSON list of School names.
	"""
	frappe.only_for([ROLE_FIELD_USER, "System Manager"])

	if bool(kit_type) == bool(item_type):
		frappe.throw(_("Select either a Kit or an Item for this requisition."))

	qty = cint(quantity)
	if qty <= 0:
		frappe.throw(_("Quantity must be greater than zero."))

	schools = frappe.parse_json(target_schools) if target_schools else []

	pr = frappe.new_doc("Procurement Requisition")
	pr.requested_by = frappe.session.user
	pr.requested_date = frappe.utils.nowdate()
	pr.required_by_date = expected_delivery or None
	pr.fund_id = fund or None
	pr.kit = kit_type or None
	pr.request_qty = qty
	pr.remarks = remarks
	pr.status = "Pending Approval"
	pr.workflow_stage = STAGE_APPROVAL

	if kit_type:
		kit = frappe.get_doc("Kit", kit_type)
		if not kit.kit_items:
			frappe.throw(_("Kit {0} has no items.").format(kit.kit_name or kit.name))
		lines = [(row.item, round(flt(row.quantity) * qty)) for row in kit.kit_items]
	else:
		if not frappe.db.exists("Item", item_type):
			frappe.throw(_("Item {0} not found").format(item_type))
		lines = [(item_type, qty)]

	for idx, (item, line_qty) in enumerate(lines, start=1):
		pr.append(
			"line_items",
			{
				"pr_line_id": idx,
				"item_id": item,
				"qty": line_qty,
				"estimated_unit_cost": str(_latest_unit_price(item)),
			},
		)

	for school in schools:
		pr.append("target_schools", {"school": school})

	_log(pr, "requisition", "submitted", remarks)
	pr.flags.ignore_permissions = True
	pr.insert()

	summary = _pr_summary(pr)
	return {
		"pr_id": pr.name,
		"item": summary["item"],
		"requested_by": summary["requested_by"],
		"date": summary["date"],
		"message": _("{0} submitted for approval.").format(pr.name),
	}


@frappe.whitelist()
def decide_purchase_requisition(pr_id: str, decision: str, remarks: str = "") -> dict:
	"""Step 2 (Approval) — only the Senior Manager role may approve/reject."""
	frappe.only_for([ROLE_SENIOR_MANAGER, "System Manager"])

	if decision not in ("approve", "reject"):
		frappe.throw(_("decision must be 'approve' or 'reject'"))

	pr = _get_pr(pr_id)
	_require_stage(pr, STAGE_APPROVAL)

	if decision == "approve":
		pr.status = "Approved"
		pr.workflow_stage = STAGE_QUOTATIONS
		pr.approved_by = frappe.session.user
		pr.approved_date = frappe.utils.nowdate()
		pr.approved_amount = _pr_estimated_value(pr)
		_log(pr, "approval", "approved", remarks)
	else:
		pr.status = "Rejected"
		pr.workflow_stage = STAGE_REJECTED
		_log(pr, "approval", "rejected", remarks)
	_save_pr(pr)

	verb = "approved" if decision == "approve" else "rejected"
	return {"pr_id": pr.name, "decision": decision, "message": _("{0} has been {1}.").format(pr.name, verb)}


def _quotation_row(q) -> dict:
	return {
		"name": q.name,
		"vendor": q.vendor,
		"vendor_name": frappe.db.get_value("Vendor", q.vendor, "vendor_name") or q.vendor,
		"quote_ref": q.quote_ref,
		"quotation_date": q.quotation_date,
		"total_amount": flt(q.total_amount),
		"delivery_days": q.delivery_days,
		"valid_until": q.valid_until,
		"status": q.status,
		"attachment": q.attachment,
	}


@frappe.whitelist()
def list_vendor_quotations(pr_id: str) -> list[dict]:
	frappe.only_for(ALL_ROLES_AND_SYSTEM_MANAGER)
	quotations = frappe.get_all(
		"Vendor Quotation",
		filters={"procurement_requisition": pr_id},
		fields=[
			"name",
			"vendor",
			"quote_ref",
			"quotation_date",
			"total_amount",
			"delivery_days",
			"valid_until",
			"status",
			"attachment",
		],
		order_by="total_amount asc",
	)
	return [_quotation_row(frappe._dict(q)) for q in quotations]


@frappe.whitelist()
def add_vendor_quotation(
	pr_id: str,
	vendor: str,
	total_amount: str,
	quote_ref: str = "",
	quotation_date: str = "",
	delivery_days: str = "",
	valid_until: str = "",
	file_url: str = "",
) -> dict:
	"""Step 3 (Quotations) — Admin records one vendor's quote; repeatable."""
	frappe.only_for([ROLE_ADMIN, "System Manager"])

	pr = _get_pr(pr_id)
	_require_stage(pr, STAGE_QUOTATIONS, STAGE_VENDOR_SELECTION)

	if flt(total_amount) <= 0:
		frappe.throw(_("Quotation amount must be greater than zero."))

	quotation = frappe.get_doc(
		{
			"doctype": "Vendor Quotation",
			"procurement_requisition": pr.name,
			"vendor": vendor,
			"quote_ref": quote_ref,
			"quotation_date": quotation_date or frappe.utils.nowdate(),
			"total_amount": flt(total_amount),
			"delivery_days": cint(delivery_days),
			"valid_until": valid_until or None,
			"status": "Received",
		}
	)
	quotation.insert(ignore_permissions=True)
	if file_url:
		quotation.db_set("attachment", _attach_file(file_url, "Vendor Quotation", quotation.name))
		_attach_file(file_url, "Procurement Requisition", pr.name)

	vendor_name = frappe.db.get_value("Vendor", vendor, "vendor_name") or vendor
	_log(pr, "quotations", "quote_added", f"{vendor_name}: {_inr(total_amount)}", file_url or None)
	_save_pr(pr)

	return {"pr_id": pr.name, "quotation": _quotation_row(quotation), "message": _("Quotation added.")}


@frappe.whitelist()
def close_quotation_collection(pr_id: str) -> dict:
	"""Step 3 -> 4 — Admin is done collecting quotes and moves to selection."""
	frappe.only_for([ROLE_ADMIN, "System Manager"])

	pr = _get_pr(pr_id)
	if pr.workflow_stage == STAGE_VENDOR_SELECTION:
		return {"pr_id": pr.name, "message": _("Already at Vendor Selection.")}
	_require_stage(pr, STAGE_QUOTATIONS)

	if not frappe.db.exists("Vendor Quotation", {"procurement_requisition": pr.name}):
		frappe.throw(_("Add at least one vendor quotation first."))

	pr.workflow_stage = STAGE_VENDOR_SELECTION
	count = frappe.db.count("Vendor Quotation", {"procurement_requisition": pr.name})
	_log(pr, "quotations", "quotations_closed", f"{count} quotation(s) received")
	_save_pr(pr)
	return {"pr_id": pr.name, "message": _("Quotation collection closed.")}


@frappe.whitelist()
def select_vendor(pr_id: str, quotation: str, justification: str) -> dict:
	"""Step 4 (Vendor Selection) — Admin picks a quote; raises the Purchase Order."""
	frappe.only_for([ROLE_ADMIN, "System Manager"])

	if not (justification or "").strip():
		frappe.throw(_("A justification is required."))

	pr = _get_pr(pr_id)
	_require_stage(pr, STAGE_VENDOR_SELECTION)

	quote = frappe.get_doc("Vendor Quotation", quotation)
	if quote.procurement_requisition != pr.name:
		frappe.throw(_("Quotation {0} does not belong to {1}.").format(quote.name, pr.name))

	po = frappe.get_doc(
		{
			"doctype": "VE Purchase Order",
			"vendor_id": quote.vendor,
			"fund_id": pr.fund_id,
			"pr_ids": pr.name,
			"vendor_quotation": quote.name,
			"order_date": frappe.utils.nowdate(),
			"expected_del_date": frappe.utils.add_days(frappe.utils.nowdate(), cint(quote.delivery_days)),
			"status": "Ordered",
			"total_amount": flt(quote.total_amount),
			"line_items": [
				{
					"item_id": row.item_id,
					"qty": row.qty,
					"unit_price": str(
						_latest_unit_price(row.item_id, quote.vendor) or flt(row.estimated_unit_cost)
					),
				}
				for row in pr.line_items
			],
		}
	)
	po.insert(ignore_permissions=True)

	for other in frappe.get_all(
		"Vendor Quotation", filters={"procurement_requisition": pr.name}, pluck="name"
	):
		frappe.db.set_value(
			"Vendor Quotation", other, "status", "Selected" if other == quote.name else "Not Selected"
		)

	pr.status = "Ordered"
	pr.workflow_stage = STAGE_PAYMENT_APPROVAL
	pr.selected_quotation = quote.name
	pr.vendor_justification = justification
	pr.purchase_order = po.name
	vendor_name = frappe.db.get_value("Vendor", quote.vendor, "vendor_name") or quote.vendor
	_log(pr, "vendor-selection", "vendor_selected", f"{vendor_name} ({po.name}): {justification}")
	_save_pr(pr)

	return {
		"pr_id": pr.name,
		"purchase_order": po.name,
		"message": _("{0} selected; {1} raised.").format(vendor_name, po.name),
	}


@frappe.whitelist()
def decide_payment_approval(
	pr_id: str,
	decision: str,
	invoice_number: str = "",
	invoice_date: str = "",
	amount: str = "",
	gst_amount: str = "",
	file_url: str = "",
	remarks: str = "",
) -> dict:
	"""Step 5 (Payment Approval) — Finance records the vendor invoice and approves
	payment, or requests a revision (stays at this step)."""
	frappe.only_for([ROLE_FINANCE, "System Manager"])

	if decision not in ("approve", "request_revision"):
		frappe.throw(_("decision must be 'approve' or 'request_revision'"))

	pr = _get_pr(pr_id)
	_require_stage(pr, STAGE_PAYMENT_APPROVAL)

	if decision == "request_revision":
		# Back to Vendor Selection: the raised PO is cancelled and the quotes
		# reopened, so Admin can re-select (or add a revised quote).
		if not (remarks or "").strip():
			frappe.throw(_("Remarks are required when requesting a revision."))
		if pr.purchase_order:
			frappe.db.set_value("VE Purchase Order", pr.purchase_order, "status", "Cancelled")
		for quote in frappe.get_all(
			"Vendor Quotation", filters={"procurement_requisition": pr.name}, pluck="name"
		):
			frappe.db.set_value("Vendor Quotation", quote, "status", "Received")
		attachment = _attach_file(file_url, "Procurement Requisition", pr.name)
		cancelled = f" ({pr.purchase_order} cancelled)" if pr.purchase_order else ""
		_log(pr, "payment-approval", "revision_requested", f"{remarks}{cancelled}", attachment)
		pr.purchase_order = None
		pr.selected_quotation = None
		pr.vendor_justification = None
		pr.status = "Approved"
		pr.workflow_stage = STAGE_VENDOR_SELECTION
		_save_pr(pr)
		return {
			"pr_id": pr.name,
			"decision": decision,
			"message": _("Revision requested — {0} is back at Vendor Selection.").format(pr.name),
		}

	if not invoice_number or not file_url:
		frappe.throw(_("Invoice number and invoice file are required to approve payment."))

	po = frappe.get_doc("VE Purchase Order", pr.purchase_order)
	invoice_amount = flt(amount) or flt(po.total_amount)
	invoice = frappe.get_doc(
		{
			"doctype": "Vendor Invoice",
			"procurement_requisition": pr.name,
			"po_id": po.name,
			"vendor_id": po.vendor_id,
			"invoice_number": invoice_number,
			"invoice_date": invoice_date or frappe.utils.nowdate(),
			"amount": str(invoice_amount),
			"gst_amount": gst_amount,
			"match_status": "Matched" if abs(invoice_amount - flt(po.total_amount)) < 1 else "Discrepancy",
			"approval_status": "Approved",
		}
	)
	invoice.insert(ignore_permissions=True)
	invoice.db_set("invoice_file", _attach_file(file_url, "Vendor Invoice", invoice.name))
	_attach_file(file_url, "Procurement Requisition", pr.name)

	pr.vendor_invoice = invoice.name
	pr.workflow_stage = STAGE_PAYMENT
	_log(pr, "payment-approval", "payment_approved", remarks or f"Invoice {invoice_number}", file_url)
	_save_pr(pr)

	return {
		"pr_id": pr.name,
		"decision": decision,
		"invoice": invoice.name,
		"message": _("Payment approved for {0}.").format(pr.name),
	}


@frappe.whitelist()
def record_payment(
	pr_id: str,
	amount: str,
	payment_mode: str,
	payment_date: str,
	utr_number: str,
	bank_account: str,
	advance_percentage: str = "",
	remarks: str = "",
) -> dict:
	"""Step 6 (Payment) — Finance records the payment against the vendor invoice."""
	frappe.only_for([ROLE_FINANCE, "System Manager"])

	pr = _get_pr(pr_id)
	_require_stage(pr, STAGE_PAYMENT)

	if flt(amount) <= 0:
		frappe.throw(_("Payment amount must be greater than zero."))

	invoice = frappe.get_doc("Vendor Invoice", pr.vendor_invoice)
	payment = frappe.get_doc(
		{
			"doctype": "Payment",
			"procurement_requisition": pr.name,
			"invoice_id": invoice.name,
			"vendor_id": invoice.vendor_id,
			"payment_date": payment_date,
			"amount": str(flt(amount)),
			"mode": payment_mode,
			"utr_reference_number": utr_number,
			"bank_account": bank_account,
			"advance_percentage": flt(advance_percentage),
			"remarks": remarks,
			"status": "Paid",
		}
	)
	payment.insert(ignore_permissions=True)

	pr.payment = payment.name
	pr.workflow_stage = STAGE_DISPATCH
	_log(pr, "payment", "payment_recorded", f"{_inr(amount)} via {payment_mode}, UTR {utr_number}")
	_save_pr(pr)

	return {
		"pr_id": pr.name,
		"payment": payment.name,
		"message": _("Payment {0} recorded.").format(payment.name),
	}


@frappe.whitelist()
def confirm_dispatch(
	pr_id: str,
	dispatch_date: str,
	transporter: str,
	lr_docket_no: str,
	file_url: str = "",
) -> dict:
	"""Step 7 (Dispatch) — Admin dispatches; one Delivery Challan per target
	school, with the requested quantity split evenly across schools."""
	frappe.only_for([ROLE_ADMIN, "System Manager"])

	pr = _get_pr(pr_id)
	_require_stage(pr, STAGE_DISPATCH)

	if frappe.utils.getdate(dispatch_date) < frappe.utils.getdate(pr.requested_date):
		frappe.throw(_("Dispatch date can't be before the request date ({0}).").format(pr.requested_date))

	schools = [row.school for row in pr.target_schools] or [None]
	kit_shares = _split_evenly(pr.request_qty or 0, len(schools))
	line_shares = [_split_evenly(row.qty, len(schools)) for row in pr.line_items]

	challans = []
	for idx, school in enumerate(schools):
		dc = frappe.get_doc(
			{
				"doctype": "Delivery Challan",
				"procurement_requisition": pr.name,
				"purchase_order": pr.purchase_order,
				"school": school,
				"kit": pr.kit,
				"kit_qty": kit_shares[idx],
				"status": "Dispatched",
				"dispatch_date": dispatch_date,
				"transporter": transporter,
				"lr_docket_no": lr_docket_no,
				"items": [
					{"item": row.item_id, "qty": line_shares[line_idx][idx]}
					for line_idx, row in enumerate(pr.line_items)
					if line_shares[line_idx][idx]
				],
			}
		)
		dc.insert(ignore_permissions=True)
		if file_url:
			dc.db_set("transport_certificate", _attach_file(file_url, "Delivery Challan", dc.name))
		challans.append(dc.name)

	attachment = _attach_file(file_url, "Procurement Requisition", pr.name)
	pr.workflow_stage = STAGE_DELIVERY
	_log(
		pr, "dispatch", "dispatched", f"{transporter}, LR {lr_docket_no} — {', '.join(challans)}", attachment
	)
	_save_pr(pr)

	return {
		"pr_id": pr.name,
		"delivery_challans": challans,
		"message": _("Dispatched: {0}.").format(", ".join(challans)),
	}


@frappe.whitelist()
def confirm_delivery(
	pr_id: str,
	received_date: str,
	received_by: str,
	condition: str = "Good",
	remarks: str = "",
	file_url: str = "",
) -> dict:
	"""Step 8 (Delivery Confirmation) — Field User confirms receipt; raises the
	Goods Receipt Note and closes the PR."""
	frappe.only_for([ROLE_FIELD_USER, "System Manager"])

	if condition not in ("Good", "Damaged", "Shortage"):
		frappe.throw(_("condition must be Good, Damaged or Shortage"))
	if not file_url:
		frappe.throw(_("The signed delivery challan is required."))

	pr = _get_pr(pr_id)
	_require_stage(pr, STAGE_DELIVERY)

	challans = frappe.get_all("Delivery Challan", filters={"procurement_requisition": pr.name}, pluck="name")
	grn = frappe.get_doc(
		{
			"doctype": "Good Receipt Notes",
			"procurement_requisition": pr.name,
			"po_id": pr.purchase_order,
			"received_date": received_date,
			"received_by": received_by,
			"invoice_number": frappe.db.get_value("Vendor Invoice", pr.vendor_invoice, "invoice_number"),
			"challan_number": ", ".join(challans),
			"condition": condition,
			"remarks": remarks,
			"status": "Received",
			"line_items": [
				{"item_id": row.item_id, "qty_ordered": row.qty, "qty_received": row.qty}
				for row in pr.line_items
			],
		}
	)
	grn.insert(ignore_permissions=True)
	grn.db_set("signed_challan", _attach_file(file_url, "Good Receipt Notes", grn.name))

	for dc in challans:
		frappe.db.set_value(
			"Delivery Challan",
			dc,
			{
				"status": "Delivered",
				"received_date": received_date,
				"received_by": received_by,
				"condition": condition,
				"signed_challan": file_url,
			},
		)
	frappe.db.set_value("VE Purchase Order", pr.purchase_order, "status", "Received")

	_attach_file(file_url, "Procurement Requisition", pr.name)
	pr.goods_receipt = grn.name
	pr.status = "Received"
	pr.workflow_stage = STAGE_COMPLETED
	_log(pr, "delivery", "delivered", remarks or f"Condition: {condition}", file_url)
	_save_pr(pr)

	return {
		"pr_id": pr.name,
		"goods_receipt": grn.name,
		"message": _("Delivery confirmed; {0} closed.").format(pr.name),
	}


@frappe.whitelist()
def add_pr_attachment(pr_id: str, file_url: str, stage: str, remarks: str = "") -> dict:
	"""Attach a supporting document to any step's audit trail."""
	frappe.only_for(ALL_ROLES_AND_SYSTEM_MANAGER)

	if stage not in STEP_LABELS:
		frappe.throw(_("Unknown stage {0}").format(stage))

	pr = _get_pr(pr_id)
	attachment = _attach_file(file_url, "Procurement Requisition", pr.name)
	_log(pr, stage, "attachment_added", remarks, attachment)
	_save_pr(pr)
	return {"pr_id": pr.name, "file_url": attachment, "message": _("Attachment added.")}


@frappe.whitelist()
def list_purchase_requisitions(stage: str = "", mine: str = "") -> list[dict]:
	"""All PRs, newest first — visible to every role (read-only for roles
	that aren't the current step's actor). `stage` filters by stage id."""
	frappe.only_for(ALL_ROLES_AND_SYSTEM_MANAGER)

	filters = {}
	if stage:
		label = next((label for label, sid in STAGE_IDS.items() if sid == stage), None)
		if not label:
			frappe.throw(_("Unknown stage {0}").format(stage))
		filters["workflow_stage"] = label
	if cint(mine):
		filters["requested_by"] = frappe.session.user

	names = frappe.get_all("Procurement Requisition", filters=filters, pluck="name", order_by="creation desc")
	return [_pr_summary(frappe.get_doc("Procurement Requisition", name)) for name in names]


def _uploaded_file_name(activity_row) -> str:
	"""The name the user uploaded the file under. Frappe de-duplicates
	identical uploads onto one file_url, so the URL alone can carry an
	earlier upload's name."""
	name = frappe.db.get_value(
		"File",
		{
			"file_url": activity_row.attachment,
			"owner": activity_row.performed_by,
			"creation": ["<=", activity_row.performed_at],
		},
		"file_name",
		order_by="creation desc",
	)
	return name or activity_row.attachment.rsplit("/", 1)[-1]


@frappe.whitelist()
def get_purchase_requisition_status(pr_id: str) -> dict:
	"""Everything about one PR: the record, every downstream document, and
	the activity trail — powers the status page and each step's screen."""
	frappe.only_for(ALL_ROLES_AND_SYSTEM_MANAGER)

	pr = _get_pr(pr_id)
	summary = _pr_summary(pr)

	def linked(doctype, name, fields):
		return frappe.db.get_value(doctype, name, fields, as_dict=True) if name else None

	purchase_order = linked(
		"VE Purchase Order",
		pr.purchase_order,
		["name", "vendor_id", "total_amount", "order_date", "expected_del_date", "status"],
	)
	if purchase_order:
		purchase_order["vendor_name"] = frappe.db.get_value("Vendor", purchase_order.vendor_id, "vendor_name")

	selected = None
	if pr.selected_quotation:
		selected = _quotation_row(frappe.get_doc("Vendor Quotation", pr.selected_quotation))

	dispatches = frappe.get_all(
		"Delivery Challan",
		filters={"procurement_requisition": pr.name},
		fields=[
			"name",
			"school",
			"state",
			"kit_qty",
			"dispatch_date",
			"transporter",
			"lr_docket_no",
			"status",
			"received_date",
		],
		order_by="name asc",
	)
	for dc in dispatches:
		dc["school_name"] = frappe.db.get_value("School", dc.school, "school_name") if dc.school else ""

	return {
		"pr_id": pr.name,
		"stage": summary["stage"],
		"stage_label": pr.workflow_stage,
		"status": pr.status,
		"record": {
			**summary,
			"kit": pr.kit,
			"requested_by_user": pr.requested_by,
			"requested_date": pr.requested_date,
			"required_by_date": pr.required_by_date,
			"fund": pr.fund_id,
			"remarks": pr.remarks,
			"approved_by": frappe.utils.get_fullname(pr.approved_by) if pr.approved_by else "",
			"approved_date": pr.approved_date,
			"vendor_justification": pr.vendor_justification,
			"target_schools": [
				{
					"school": row.school,
					**(
						frappe.db.get_value("School", row.school, ["school_name", "state"], as_dict=True)
						or {}
					),
				}
				for row in pr.target_schools
			],
			"line_items": [
				{
					"item_id": row.item_id,
					"item_name": frappe.db.get_value("Item", row.item_id, "item_name"),
					"qty": row.qty,
					"estimated_unit_cost": flt(row.estimated_unit_cost),
				}
				for row in pr.line_items
			],
		},
		"quotations": list_vendor_quotations(pr.name),
		"selected_quotation": selected,
		"purchase_order": purchase_order,
		"vendor_invoice": linked(
			"Vendor Invoice",
			pr.vendor_invoice,
			[
				"name",
				"invoice_number",
				"invoice_date",
				"amount",
				"match_status",
				"approval_status",
				"invoice_file",
			],
		),
		"payment": linked(
			"Payment",
			pr.payment,
			["name", "payment_date", "amount", "mode", "utr_reference_number", "bank_account", "status"],
		),
		"dispatches": dispatches,
		"discrepancies": frappe.get_all(
			"Delivery Discrepancy",
			filters={"procurement_requisition": pr.name},
			fields=["name", "dc_number", "item", "expected_qty", "received_qty", "shortage", "action_taken"],
			order_by="creation asc",
		),
		"goods_receipt": linked(
			"Good Receipt Notes",
			pr.goods_receipt,
			["name", "received_date", "received_by", "condition", "signed_challan"],
		),
		"activity": [
			{
				"stage": STEP_IDS_BY_LABEL.get(row.stage, row.stage),
				"stage_label": row.stage,
				"action": row.action,
				"performed_by": frappe.utils.get_fullname(row.performed_by) if row.performed_by else "",
				"performed_at": row.performed_at,
				"remarks": row.remarks,
				"attachment": row.attachment,
				"attachment_name": _uploaded_file_name(row) if row.attachment else None,
			}
			for row in pr.activity
		],
	}


@frappe.whitelist()
def list_school_dispatches(school: str) -> list[dict]:
	"""Delivery Challans sent to one school — SchoolDetail's dispatch history."""
	frappe.only_for(ALL_ROLES_AND_SYSTEM_MANAGER)
	rows = frappe.get_all(
		"Delivery Challan",
		filters={"school": school},
		fields=[
			"name",
			"procurement_requisition",
			"kit",
			"kit_qty",
			"dispatch_date",
			"status",
			"received_date",
		],
		order_by="dispatch_date desc",
	)
	for row in rows:
		pr = frappe.get_doc("Procurement Requisition", row.procurement_requisition)
		row["item"] = _pr_item_label(pr)
	return rows


# ---------------------------------------------------------------------------
# Vendor Item Prices — the price list PR estimates and PO lines read from.
# ---------------------------------------------------------------------------


@frappe.whitelist()
def list_vendor_item_prices(vendor: str = "", item: str = "") -> list[dict]:
	frappe.only_for(ALL_ROLES_AND_SYSTEM_MANAGER)
	filters = {}
	if vendor:
		filters["vendor"] = vendor
	if item:
		filters["item"] = item
	rows = frappe.get_all(
		"Vendor Item Price",
		filters=filters,
		fields=["name", "vendor", "item", "year", "kit_qty", "unit_price", "effective_date", "gst_rate"],
		order_by="effective_date desc, modified desc",
	)
	for row in rows:
		row["vendor_name"] = frappe.db.get_value("Vendor", row.vendor, "vendor_name") or row.vendor
		row["item_name"] = frappe.db.get_value("Item", row.item, "item_name") or row.item
	return rows


@frappe.whitelist()
def save_vendor_item_price(
	vendor: str,
	item: str,
	unit_price: str,
	effective_date: str,
	gst_rate: str = "",
	year: str = "",
	kit_qty: str = "",
	name: str = "",
) -> dict:
	"""Create (no `name`) or update a Vendor Item Price. Admin only."""
	frappe.only_for([ROLE_ADMIN, "System Manager"])

	if flt(unit_price) <= 0:
		frappe.throw(_("Unit price must be greater than zero."))

	doc = frappe.get_doc("Vendor Item Price", name) if name else frappe.new_doc("Vendor Item Price")
	doc.update(
		{
			"vendor": vendor,
			"item": item,
			"unit_price": flt(unit_price),
			"effective_date": effective_date,
			"gst_rate": flt(gst_rate),
			"year": cint(year) or frappe.utils.getdate(effective_date).year,
			"kit_qty": flt(kit_qty),
		}
	)
	doc.save(ignore_permissions=True)
	return {"name": doc.name, "message": _("Price saved.")}


@frappe.whitelist()
def delete_vendor_item_price(name: str) -> dict:
	frappe.only_for([ROLE_ADMIN, "System Manager"])
	frappe.delete_doc("Vendor Item Price", name, ignore_permissions=True)
	return {"name": name, "message": _("Price deleted.")}


# ---------------------------------------------------------------------------
# Stock — there is no stock ledger, so on-hand is derived:
#   in hand = Item.opening_stock + procured (PO qty on paid PRs)
#             - dispatched (Delivery Challan qty)
# ---------------------------------------------------------------------------


def _stock_by_item() -> list[dict]:
	procured = dict(
		frappe.db.sql(
			"""
			select pli.item_id, sum(pli.qty)
			from `tabPO Line Item` pli
			join `tabVE Purchase Order` po on po.name = pli.parent and pli.parenttype = 'VE Purchase Order'
			join `tabProcurement Requisition` pr on pr.name = po.pr_ids
			where pr.workflow_stage in %(stages)s and po.status != 'Cancelled'
			group by pli.item_id
			""",
			{"stages": PAID_STAGES},
		)
	)
	dispatched = dict(
		frappe.db.sql(
			"""
			select dci.item, sum(dci.qty)
			from `tabDelivery Challan Item` dci
			where dci.parenttype = 'Delivery Challan'
			group by dci.item
			"""
		)
	)
	items = frappe.get_all(
		"Item",
		filters={"active": 1},
		fields=["name", "item_name", "category", "unit", "reorder_level", "opening_stock"],
		order_by="item_name asc",
	)
	rows = []
	for item in items:
		proc = cint(item.opening_stock) + cint(procured.get(item.name))
		disp = cint(dispatched.get(item.name))
		in_hand = proc - disp
		if in_hand <= 0:
			status = "Zero Stock"
		elif in_hand < cint(item.reorder_level):
			status = "Below Reorder"
		else:
			status = "Stock OK"
		rows.append(
			{
				"id": item.name,
				"name": item.item_name,
				"category": item.category,
				"unit": item.unit or "units",
				"procured": proc,
				"dispatched": disp,
				"inHand": in_hand,
				"reorderLevel": cint(item.reorder_level),
				"status": status,
			}
		)
	return rows


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


def _po_total_between(start, end) -> float:
	return flt(
		frappe.db.sql(
			"select sum(total_amount) from `tabVE Purchase Order` where status != 'Cancelled' and order_date between %s and %s",
			(start, end),
		)[0][0]
	)


def _pending_payment_total() -> float:
	return flt(
		frappe.db.sql(
			"""
			select sum(po.total_amount)
			from `tabProcurement Requisition` pr
			join `tabVE Purchase Order` po on po.name = pr.purchase_order
			where pr.workflow_stage in %(stages)s
			""",
			{"stages": (STAGE_PAYMENT_APPROVAL, STAGE_PAYMENT)},
		)[0][0]
	)


def _prs_at(*stages: str) -> list:
	names = frappe.get_all(
		"Procurement Requisition",
		filters={"workflow_stage": ["in", stages]},
		pluck="name",
		order_by="creation desc",
	)
	return [frappe.get_doc("Procurement Requisition", n) for n in names]


def _monthly_spend(months: int = 6) -> list[dict]:
	today = frappe.utils.getdate()
	out = []
	for offset in range(months - 1, -1, -1):
		start = frappe.utils.get_first_day(frappe.utils.add_months(today, -offset))
		end = frappe.utils.get_last_day(start)
		out.append({"month": start.strftime("%b"), "amount": _po_total_between(start, end)})
	return out


def _kpi_total_po_value_this_month() -> dict:
	today = frappe.utils.getdate()
	this_month = _po_total_between(frappe.utils.get_first_day(today), frappe.utils.get_last_day(today))
	last_start = frappe.utils.get_first_day(frappe.utils.add_months(today, -1))
	last_month = _po_total_between(last_start, frappe.utils.get_last_day(last_start))
	if last_month:
		change = f"{(this_month - last_month) / last_month * 100:+.0f}% vs last month"
	else:
		change = "No POs last month"
	return {"value": _inr(this_month), "change": change}


def _kpi_items_below_reorder(stock) -> dict:
	count = sum(
		1 for row in stock if row["status"] in ("Below Reorder", "Zero Stock") and row["reorderLevel"] > 0
	)
	return {
		"value": f"{count} Items",
		"note": "Critical Alert: Requires PR creation" if count else "All items above reorder level",
	}


def _kpi_schools_dispatched() -> dict:
	active = frappe.db.count("School", {"active": 1})
	reached = frappe.db.sql(
		"select count(distinct school) from `tabDelivery Challan` where school is not null"
	)[0][0]
	percent = round(reached / active * 100) if active else 0
	return {"value": f"{percent}% Complete", "percent": percent}


@frappe.whitelist()
def get_dashboard_kpis() -> dict:
	"""Dashboard data, scoped to whichever KPIs/sections the caller's role(s) may see.

	Client-side route guards (see public/js/vision_empower/router) and the
	widget-visibility config (config/dashboardWidgets.js) are UX only — this
	is the real security boundary, and it only returns data the caller is
	actually permitted to see, not just an all-or-nothing endpoint gate.
	Each section is only computed if the caller may see it.
	"""
	frappe.only_for(ALL_ROLES_AND_SYSTEM_MANAGER)
	layout = _layout_visible_to_caller()
	kpis_wanted, sections_wanted = set(layout["kpis"]), set(layout["sections"])

	stock = (
		_stock_by_item()
		if {"items_below_reorder", "reorder_alerts"} & (kpis_wanted | sections_wanted)
		else []
	)

	kpi_builders = {
		"total_po_value_this_month": _kpi_total_po_value_this_month,
		"items_below_reorder": lambda: _kpi_items_below_reorder(stock),
		"schools_dispatched": _kpi_schools_dispatched,
		"pending_payments": lambda: {
			"value": _inr(_pending_payment_total()),
			"note": "Awaiting payment release",
		},
	}

	def reorder_alerts():
		return [
			{
				"item": row["name"],
				"item_id": row["id"],
				"min_level": row["reorderLevel"],
				"units_left": row["inHand"],
				"unit": row["unit"],
			}
			for row in stock
			if row["reorderLevel"] > 0 and row["inHand"] < row["reorderLevel"]
		]

	def my_requisitions():
		names = frappe.get_all(
			"Procurement Requisition",
			filters={"requested_by": frappe.session.user},
			pluck="name",
			order_by="creation desc",
			limit=10,
		)
		return [_pr_summary(frappe.get_doc("Procurement Requisition", n)) for n in names]

	def pending_approvals():
		return [_pr_summary(pr) for pr in _prs_at(STAGE_APPROVAL)]

	def vendor_quotations():
		out = []
		for pr in _prs_at(STAGE_QUOTATIONS, STAGE_VENDOR_SELECTION):
			row = _pr_summary(pr)
			row["quotes_received"] = frappe.db.count("Vendor Quotation", {"procurement_requisition": pr.name})
			out.append(row)
		return out

	def payments_queue():
		out = []
		for pr in _prs_at(STAGE_PAYMENT_APPROVAL, STAGE_PAYMENT):
			row = _pr_summary(pr)
			row["amount"] = _inr(frappe.db.get_value("VE Purchase Order", pr.purchase_order, "total_amount"))
			out.append(row)
		return out

	section_builders = {
		"reorder_alerts": reorder_alerts,
		"my_requisitions": my_requisitions,
		"pending_approvals": pending_approvals,
		"vendor_quotations": vendor_quotations,
		"payments_queue": payments_queue,
		"spend_trend": _monthly_spend,
	}

	return {
		"kpis": {key: build() for key, build in kpi_builders.items() if key in kpis_wanted},
		**{key: build() for key, build in section_builders.items() if key in sections_wanted},
	}


# ---------------------------------------------------------------------------
# Reports — read-only aggregations, all 4 roles.
# ---------------------------------------------------------------------------

_REPORT_ROLES = ALL_ROLES_AND_SYSTEM_MANAGER


def _date_range_start(date_range: str):
	"""'this_month' | 'last_90_days' | 'this_fy' (Apr-Mar) | '' (all time)."""
	today = frappe.utils.getdate()
	if date_range == "this_month":
		return frappe.utils.get_first_day(today)
	if date_range == "last_90_days":
		return frappe.utils.add_days(today, -90)
	if date_range == "this_fy":
		year = today.year if today.month >= 4 else today.year - 1
		return frappe.utils.getdate(f"{year}-04-01")
	return None


@frappe.whitelist()
def get_procurement_summary_report(date_range: str = "this_fy", vendor: str = "", funder: str = "") -> dict:
	"""Procurement summary — POs, spend, payments and lead time per vendor."""
	frappe.only_for(_REPORT_ROLES)

	# Static SQL: each filter is switched off by passing NULL / "".
	values = {"start": _date_range_start(date_range), "vendor": vendor or "", "funder": funder or ""}

	pos = frappe.db.sql(
		"""
		select po.name, po.vendor_id, po.total_amount, po.pr_ids,
			coalesce(v.vendor_name, po.vendor_id) as vendor_name,
			(select coalesce(sum(p.amount), 0) from `tabPayment` p
				where p.procurement_requisition = po.pr_ids) as paid
		from `tabVE Purchase Order` po
		left join `tabVendor` v on v.name = po.vendor_id
		left join `tabFund` fund on fund.name = po.fund_id
		where po.status != 'Cancelled'
			and (%(start)s is null or po.order_date >= %(start)s)
			and (%(vendor)s = '' or po.vendor_id = %(vendor)s)
			and (%(funder)s = '' or fund.funder = %(funder)s)
		""",
		values,
		as_dict=True,
	)

	by_vendor: dict[str, dict] = {}
	for po in pos:
		row = by_vendor.setdefault(
			po.vendor_id, {"vendor": po.vendor_name, "poCount": 0, "total": 0.0, "paid": 0.0}
		)
		row["poCount"] += 1
		row["total"] += flt(po.total_amount)
		row["paid"] += flt(po.paid)

	ledger = []
	for row in sorted(by_vendor.values(), key=lambda r: r["total"], reverse=True):
		pending = max(row["total"] - row["paid"], 0)
		ledger.append(
			{
				"vendor": row["vendor"],
				"poCount": row["poCount"],
				"total": _inr(row["total"]),
				"paid": _inr(row["paid"]),
				"pending": _inr(pending),
				"totalValue": row["total"],
				"status": "Fully Settled"
				if pending < 1
				else ("Awaiting Payment" if row["paid"] else "Awaiting Invoice"),
			}
		)

	# Lead time: PR raised -> first dispatch, for PRs that reached dispatch.
	lead_times = frappe.db.sql(
		"""
		select datediff(min(dc.dispatch_date), pr.requested_date)
		from `tabDelivery Challan` dc
		join `tabProcurement Requisition` pr on pr.name = dc.procurement_requisition
		where pr.name in %(prs)s
		group by pr.name
		""",
		{"prs": tuple(po.pr_ids for po in pos) or ("",)},
	)
	avg_lead = round(sum(flt(r[0]) for r in lead_times) / len(lead_times)) if lead_times else None

	total_spend = sum(flt(po.total_amount) for po in pos)
	total_paid = sum(flt(po.paid) for po in pos)
	return {
		"kpis": {
			"total_pos": {"value": f"{len(pos)} Issued", "note": "In selected period"},
			"total_spend": {"value": _inr(total_spend), "note": "Committed budget"},
			"pending_payments": {"value": _inr(max(total_spend - total_paid, 0)), "note": "Not yet paid"},
			"avg_lead_time": {
				"value": f"{avg_lead} Days" if avg_lead is not None else "—",
				"note": "PR to Dispatch",
			},
		},
		"top_vendor_spend": [{"name": row["vendor"], "amount": row["totalValue"]} for row in ledger[:8]],
		"vendor_transactions": ledger,
		"filters": {"date_range": date_range, "vendor": vendor, "funder": funder},
	}


@frappe.whitelist()
def get_stock_status_report(category: str = "") -> dict:
	"""Stock status — derived on-hand per active Item (see _stock_by_item)."""
	frappe.only_for(_REPORT_ROLES)

	rows = _stock_by_item()
	if category:
		rows = [row for row in rows if row["category"] == category]

	return {
		"kpis": {
			"items_in_hand": {
				"value": f"{sum(max(r['inHand'], 0) for r in rows):,} Units",
				"note": "Across all locations",
			},
			"below_reorder": {
				"value": f"{sum(1 for r in rows if r['status'] == 'Below Reorder')} Items",
				"note": "Needs a PR",
			},
			"zero_stock": {
				"value": f"{sum(1 for r in rows if r['status'] == 'Zero Stock')} Items",
				"note": "Out of stock",
			},
			"never_dispatched": {
				"value": f"{sum(1 for r in rows if r['dispatched'] == 0 and r['inHand'] > 0)} Items",
				"note": "In stock, never sent to a school",
			},
		},
		"items": rows,
		"filters": {"category": category},
	}


@frappe.whitelist()
def get_dispatch_status_report(state: str = "", time_range: str = "last_90_days") -> dict:
	"""Dispatch status — one row per Delivery Challan (i.e. per school dispatch)."""
	frappe.only_for(_REPORT_ROLES)

	filters = {}
	if state:
		filters["state"] = state
	start = _date_range_start(time_range)
	if start:
		filters["dispatch_date"] = [">=", start]

	challans = frappe.get_all(
		"Delivery Challan",
		filters=filters,
		fields=[
			"name",
			"school",
			"state",
			"kit_qty",
			"dispatch_date",
			"status",
			"received_date",
			"transporter",
			"procurement_requisition",
		],
		order_by="dispatch_date desc",
	)

	schools = []
	delivered_qty = pending_qty = 0
	for dc in challans:
		confirmed = dc.status == "Delivered"
		if confirmed:
			delivered_qty += cint(dc.kit_qty)
		else:
			pending_qty += cint(dc.kit_qty)
		schools.append(
			{
				"dc": dc.name,
				"school": dc.school,
				"name": frappe.db.get_value("School", dc.school, "school_name")
				if dc.school
				else "(no school)",
				"state": dc.state or "",
				"kits": cint(dc.kit_qty),
				"date": frappe.utils.formatdate(dc.received_date or dc.dispatch_date, "dd MMM yyyy"),
				"confirmed": confirmed,
				"action": "Delivered & Signed"
				if confirmed
				else f"In transit ({dc.transporter or 'transporter n/a'})",
				"pr": dc.procurement_requisition,
			}
		)

	total = delivered_qty + pending_qty
	return {
		"kpis": {
			"kits_sent": delivered_qty,
			"kits_pending": pending_qty,
			"delivered_percent": round(delivered_qty / total * 100) if total else 0,
		},
		"states": sorted({s for s in frappe.get_all("School", filters={"active": 1}, pluck="state") if s}),
		"schools": schools,
		"filters": {"state": state, "time_range": time_range},
	}


@frappe.whitelist()
def submit_location_transfer(
	item: str, quantity: str, from_location: str, to_location: str, reason: str = ""
) -> str:
	"""Submit a new Location Transfer (status In Transit until received)."""
	frappe.only_for([ROLE_ADMIN, "System Manager"])

	if cint(quantity) <= 0:
		frappe.throw(_("Quantity must be greater than zero."))
	if from_location == to_location:
		frappe.throw(_("From and To locations must be different."))

	doc = frappe.get_doc(
		{
			"doctype": "Location Transfer",
			"item": item,
			"quantity": int(quantity),
			"from_location": from_location,
			"to_location": to_location,
			"reason": reason,
			"approved_by": frappe.session.user,
			"status": "In Transit",
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


@frappe.whitelist()
def complete_location_transfer(name: str) -> dict:
	"""Mark an In Transit transfer as received at its destination."""
	frappe.only_for([ROLE_ADMIN, "System Manager"])

	doc = frappe.get_doc("Location Transfer", name)
	if doc.status == "Completed":
		frappe.throw(_("{0} is already completed.").format(name))
	doc.status = "Completed"
	doc.save(ignore_permissions=True)
	return {"name": doc.name, "status": doc.status, "message": _("{0} marked as received.").format(name)}


@frappe.whitelist()
def list_location_transfers(filters: str | None = None) -> list[dict]:
	"""List Location Transfers."""
	frappe.only_for(_REPORT_ROLES)

	parsed_filters = {}
	if filters:
		import json

		parsed_filters = json.loads(filters)

	return frappe.get_all(
		"Location Transfer",
		filters=parsed_filters,
		fields=[
			"name",
			"item",
			"quantity",
			"from_location",
			"to_location",
			"reason",
			"approved_by",
			"status",
			"creation",
		],
		order_by="creation desc",
	)


# Master-data DocTypes the CSV importer may write to. Anything else (User,
# Role, ...) is refused — the import runs with ignore_permissions.
IMPORTABLE_DOCTYPES = {"Vendor", "School", "Item", "Kit", "Warehouse", "Fund", "Funder", "Vendor Item Price"}

_TRUTHY = {"1", "yes", "y", "true", "active"}


def _column_map(meta) -> dict:
	"""CSV header (fieldname or label, any case) -> field."""
	columns = {}
	for field in meta.fields:
		if field.fieldtype in ("Section Break", "Column Break", "Tab Break"):
			continue
		columns[field.fieldname.lower()] = field
		if field.label:
			columns[field.label.strip().lower()] = field
	return columns


def _resolve_link(doctype: str, value: str) -> str:
	"""Accept either a record name (VE-VEN-0001) or its title (ABC Supplies)."""
	if frappe.db.exists(doctype, value):
		return value
	meta = frappe.get_meta(doctype)
	# Most master doctypes have no title_field set but follow <doctype>_name.
	for title_field in (meta.get_title_field(), f"{frappe.scrub(doctype)}_name"):
		if title_field and title_field != "name" and meta.has_field(title_field):
			match = frappe.db.get_value(doctype, {title_field: value}, "name")
			if match:
				return match
	frappe.throw(_("{0} '{1}' not found").format(doctype, value))


def _parse_child_rows(field, value: str) -> list[dict]:
	"""A child-table cell as 'Link value:qty; Link value:qty' — e.g. a Kit's
	items as 'Braille Slate:2; Stylus:2'. The child table must have one
	Link field and one numeric field."""
	child_meta = frappe.get_meta(field.options)
	link = next((f for f in child_meta.fields if f.fieldtype == "Link"), None)
	number = next((f for f in child_meta.fields if f.fieldtype in ("Int", "Float")), None)
	if not link or not number:
		frappe.throw(_("Column {0} can't be imported from CSV.").format(field.label))
	rows = []
	for part in value.split(";"):
		if not part.strip():
			continue
		target, _sep, qty = part.rpartition(":")
		if not target:
			target, qty = qty, "1"
		rows.append({link.fieldname: _resolve_link(link.options, target.strip()), number.fieldname: flt(qty)})
	return rows


@frappe.whitelist()
def get_import_template(doctype: str) -> list[str]:
	"""Header labels for a blank import CSV of `doctype`."""
	frappe.only_for([ROLE_ADMIN, "System Manager"])
	if doctype not in IMPORTABLE_DOCTYPES:
		frappe.throw(_("{0} can't be imported here.").format(doctype))
	return [
		field.label or field.fieldname
		for field in frappe.get_meta(doctype).fields
		if field.fieldtype not in ("Section Break", "Column Break", "Tab Break")
		and not field.read_only
		and not field.hidden
	]


@frappe.whitelist()
def bulk_import_csv(doctype: str) -> dict:
	"""Import a CSV (multipart field 'file') into one Master Data DocType.

	Headers may be fieldnames or labels. Link cells may hold a record name
	or its title. Check cells accept 1/0, yes/no, true/false. A child-table
	cell takes 'Link value:qty; ...' (see _parse_child_rows). Each row is
	all-or-nothing; good rows are kept even if others fail.
	"""
	frappe.only_for([ROLE_ADMIN, "System Manager"])

	if doctype not in IMPORTABLE_DOCTYPES:
		frappe.throw(_("{0} can't be imported here.").format(doctype))

	if not getattr(frappe.request, "files", None) or "file" not in frappe.request.files:
		frappe.throw(_("No CSV file uploaded. Please upload a file with the key 'file'."))

	import csv
	import io

	try:
		content = frappe.request.files["file"].read().decode("utf-8-sig")
		reader = csv.DictReader(io.StringIO(content))
	except Exception as e:
		frappe.throw(_("Failed to read CSV: {0}").format(str(e)))

	if not reader.fieldnames:
		frappe.throw(_("The uploaded CSV file is empty or missing headers."))

	columns = _column_map(frappe.get_meta(doctype))
	unknown = [h for h in reader.fieldnames if h and h.strip().lower() not in columns]

	imported = 0
	errors = []
	for idx, row in enumerate(reader, start=1):
		frappe.db.savepoint("bulk_import_row")
		try:
			values = {}
			for header, raw in row.items():
				field = columns.get((header or "").strip().lower())
				value = (raw or "").strip()
				if not field or not value:
					continue
				if field.fieldtype == "Link":
					value = _resolve_link(field.options, value)
				elif field.fieldtype == "Check":
					value = 1 if value.lower() in _TRUTHY else 0
				elif field.fieldtype in ("Table", "Table MultiSelect"):
					value = _parse_child_rows(field, value)
				values[field.fieldname] = value

			doc = frappe.new_doc(doctype)
			doc.update(values)
			doc.insert(ignore_permissions=True)
			imported += 1
		except Exception as e:
			frappe.db.rollback(save_point="bulk_import_row")
			frappe.clear_messages()
			errors.append(f"Row {idx}: {e}")

	return {
		"status": "success" if not errors else "partial_success" if imported else "failed",
		"imported": imported,
		"errors": errors,
		"ignored_columns": unknown,
	}
