import { ROLES } from "./roles";

// Which dashboard widgets each role sees. All 4 roles currently see the
// same content — real per-role content hasn't been specified yet — but
// this is genuinely role-driven, so differences can be added here later
// without touching Dashboard.vue. Mirrored in api.py's
// DASHBOARD_WIDGETS_BY_ROLE, which is the real security boundary: this
// file only decides what the UI renders, not what data the server sends.
const DEFAULT_WIDGETS = {
	kpis: true,
	reorderAlerts: true,
	pendingApprovals: true,
	spendTrend: true,
};

export const DASHBOARD_WIDGETS_BY_ROLE = {
	[ROLES.FIELD_USER]: DEFAULT_WIDGETS,
	[ROLES.SENIOR_MANAGER]: DEFAULT_WIDGETS,
	[ROLES.ADMIN]: DEFAULT_WIDGETS,
	[ROLES.FINANCE]: DEFAULT_WIDGETS,
};

const NO_WIDGETS = { kpis: false, reorderAlerts: false, pendingApprovals: false, spendTrend: false };

export function getDashboardWidgetsForUser() {
	const userRoles = frappe.boot?.user?.roles || [];
	const applicableWidgetSets = Object.entries(DASHBOARD_WIDGETS_BY_ROLE)
		.filter(([role]) => userRoles.includes(role))
		.map(([, widgets]) => widgets);

	// Union across all roles a user holds, defaulting to nothing visible.
	return applicableWidgetSets.reduce(
		(visible, widgets) => {
			for (const key in widgets) visible[key] = visible[key] || widgets[key];
			return visible;
		},
		{ ...NO_WIDGETS }
	);
}
