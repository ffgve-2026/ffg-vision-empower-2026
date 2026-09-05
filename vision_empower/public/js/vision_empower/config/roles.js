// Single source of truth for role names and the sidebar/route tree.
// Update this file (not individual components) when roles or nav change.

export const ROLES = {
	FIELD_USER: "Vision Empower Field User",
	SENIOR_MANAGER: "Vision Empower Senior Manager",
	ADMIN: "Vision Empower Admin",
	FINANCE: "Vision Empower Finance",
};

export const ALL_ROLES = Object.values(ROLES);

// Which role acts on each step of the 8-step Purchase Requisition workflow.
// Mirrors the mapping agreed for the VisionEdge design spec:
// Field Coordinator -> Field User, Program Head -> Senior Manager,
// Procurement Officer -> Admin, Finance Head/Accounts -> Finance.
// Not yet wired into any page — the PR workflow itself is still a
// placeholder — kept here so the real implementation has a single place
// to read the mapping from.
export const PR_STEP_ROLES = {
	requisition: [ROLES.FIELD_USER],
	approval: [ROLES.SENIOR_MANAGER],
	quotation: [ROLES.ADMIN],
	vendorSelection: [ROLES.ADMIN],
	paymentApproval: [ROLES.FINANCE],
	payment: [ROLES.FINANCE],
	dispatch: [ROLES.ADMIN],
	deliveryConfirmation: [ROLES.FIELD_USER],
};

// Sidebar/route tree. `breadcrumb` is the trail shown in the top bar.
// All modules are visible to all 4 roles for now — the spec's RBAC is
// about which action buttons appear on each PR step, not which sidebar
// items a role can see at all.
export const NAV_ITEMS = [
	{
		name: "dashboard",
		path: "/",
		label: "Dashboard",
		breadcrumb: ["Home"],
		roles: ALL_ROLES,
	},
	{
		name: "master-data",
		label: "Master Data",
		roles: ALL_ROLES,
		children: [
			{
				name: "vendors",
				path: "/master-data/vendors",
				label: "Vendors",
				breadcrumb: ["Master Data", "Vendors"],
				roles: ALL_ROLES,
			},
			{
				name: "schools",
				path: "/master-data/schools",
				label: "Schools",
				breadcrumb: ["Master Data", "Schools"],
				roles: ALL_ROLES,
			},
			{
				name: "items",
				path: "/master-data/items",
				label: "Items",
				breadcrumb: ["Master Data", "Items"],
				roles: ALL_ROLES,
			},
			{
				name: "kits",
				path: "/master-data/kits",
				label: "Kits",
				breadcrumb: ["Master Data", "Kits"],
				roles: ALL_ROLES,
			},
		],
	},
	{
		name: "procurement",
		path: "/procurement",
		label: "Procurement",
		breadcrumb: ["Procurement"],
		roles: ALL_ROLES,
	},
	{
		name: "inventory",
		path: "/inventory",
		label: "Inventory",
		breadcrumb: ["Inventory", "Location Transfer"],
		roles: ALL_ROLES,
	},
	{
		name: "dispatch",
		path: "/dispatch",
		label: "Dispatch & Logistics",
		breadcrumb: ["Dispatch & Logistics", "Discrepancy Log"],
		roles: ALL_ROLES,
	},
	{
		name: "reports",
		label: "Reports",
		roles: ALL_ROLES,
		children: [
			{
				name: "report-procurement-summary",
				path: "/reports/procurement-summary",
				label: "Procurement Summary",
				breadcrumb: ["Reports", "Procurement Summary"],
				roles: ALL_ROLES,
			},
			{
				name: "report-stock-status",
				path: "/reports/stock-status",
				label: "Stock Status",
				breadcrumb: ["Reports", "Stock Status"],
				roles: ALL_ROLES,
			},
			{
				name: "report-dispatch-status",
				path: "/reports/dispatch-status",
				label: "Dispatch Status",
				breadcrumb: ["Reports", "Dispatch Status"],
				roles: ALL_ROLES,
			},
		],
	},
];

// Flat list of leaf nav items (the actual routable pages).
export const FLAT_NAV_ITEMS = NAV_ITEMS.flatMap((item) =>
	item.children ? item.children : [item]
);

// Client-side only — a UX convenience for hiding nav items and routes.
// The backend independently enforces these same roles on every API call
// and DocType, since a browser can never be trusted as the security boundary.
export function userHasAnyRole(allowedRoles) {
	const userRoles = frappe.boot?.user?.roles || [];
	return allowedRoles.some((role) => userRoles.includes(role));
}
