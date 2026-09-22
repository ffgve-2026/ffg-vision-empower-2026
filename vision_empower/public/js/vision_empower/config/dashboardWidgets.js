import { ROLES } from "./roles";

// Per-role dashboard layout, inferred from each role's actual
// responsibilities (the original NGO procurement role/action breakdown —
// see CLAUDE.md) since an exact per-widget spec hasn't been given yet.
// `kpis` is a list of which KPI keys show; the rest are section toggles.
// Mirrored in api.py's DASHBOARD_LAYOUT_BY_ROLE, which is the real
// security boundary — this file only decides what the UI renders.
const DASHBOARD_LAYOUT_BY_ROLE = {
	[ROLES.FIELD_USER]: {
		// Raises requests, confirms receipt — cares about what needs
		// raising and the status of what they've already raised.
		kpis: ["items_below_reorder", "schools_dispatched"],
		reorderAlerts: true,
		myRequisitions: true,
		pendingApprovals: false,
		vendorQuotations: false,
		paymentsQueue: false,
		procurementRequests: true,
		spendTrend: false,
	},
	[ROLES.SENIOR_MANAGER]: {
		// Approves/rejects — the approval queue is the centerpiece;
		// reorder alerts stay visible for context on why a PR exists.
		kpis: ["total_po_value_this_month", "items_below_reorder", "schools_dispatched"],
		reorderAlerts: true,
		myRequisitions: false,
		pendingApprovals: true,
		vendorQuotations: false,
		paymentsQueue: false,
		procurementRequests: true,
		spendTrend: true,
	},
	[ROLES.ADMIN]: {
		// Quotations/vendor selection/invoices — cares about vendor spend
		// and what's awaiting quotation or vendor selection.
		kpis: ["total_po_value_this_month", "items_below_reorder"],
		reorderAlerts: true,
		myRequisitions: false,
		pendingApprovals: false,
		vendorQuotations: true,
		paymentsQueue: false,
		procurementRequests: true,
		spendTrend: true,
	},
	[ROLES.FINANCE]: {
		// Payments — the payments queue is the centerpiece; reorder
		// alerts/approvals aren't their action.
		kpis: ["total_po_value_this_month", "pending_payments"],
		reorderAlerts: false,
		myRequisitions: false,
		pendingApprovals: false,
		vendorQuotations: false,
		paymentsQueue: true,
		procurementRequests: true,
		spendTrend: true,
	},
};

const EMPTY_LAYOUT = {
	kpis: [],
	reorderAlerts: false,
	myRequisitions: false,
	pendingApprovals: false,
	vendorQuotations: false,
	paymentsQueue: false,
	procurementRequests: false,
	spendTrend: false,
};

export function getDashboardWidgetsForUser() {
	const userRoles = frappe.boot?.user?.roles || [];
	const applicableLayouts = Object.entries(DASHBOARD_LAYOUT_BY_ROLE)
		.filter(([role]) => userRoles.includes(role))
		.map(([, layout]) => layout);

	// Union across all roles a user holds (matches Administrator, who
	// Frappe grants every role — sees everything, useful for testing).
	return applicableLayouts.reduce(
		(visible, layout) => ({
			kpis: Array.from(new Set([...visible.kpis, ...layout.kpis])),
			reorderAlerts: visible.reorderAlerts || layout.reorderAlerts,
			myRequisitions: visible.myRequisitions || layout.myRequisitions,
			pendingApprovals: visible.pendingApprovals || layout.pendingApprovals,
			vendorQuotations: visible.vendorQuotations || layout.vendorQuotations,
			paymentsQueue: visible.paymentsQueue || layout.paymentsQueue,
			procurementRequests: visible.procurementRequests || layout.procurementRequests,
			spendTrend: visible.spendTrend || layout.spendTrend,
		}),
		{ ...EMPTY_LAYOUT }
	);
}
