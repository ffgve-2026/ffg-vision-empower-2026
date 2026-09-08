// Static mock data for the Dashboard, matching the VisionEdge design spec's
// sample values exactly. Replace with real DocType-backed data once Master
// Data / Purchase Requisition doctypes exist — this keeps the Dashboard
// wired end-to-end (through a real, role-checked backend call) without
// requiring the full data model yet.

export const DASHBOARD_KPIS = {
	totalPoValueThisMonth: { value: "₹24,85,000", change: "+12% vs last month" },
	itemsBelowReorder: { value: "18 Items", note: "Critical Alert: Requires PR creation" },
	schoolsDispatched: { value: "67% Complete", percent: 67 },
	pendingPayments: { value: "₹8,42,000", note: "Awaiting Funder Release" },
};

export const REORDER_ALERTS = [
	{ item: "First-Aid Kits (Grade A)", minLevel: 50, unitsLeft: 12, unit: "units" },
	{ item: "Solar Lanterns (Heavy Duty)", minLevel: 30, unitsLeft: 5, unit: "units" },
	{ item: "Primary Math Textbooks", minLevel: 100, unitsLeft: 45, unit: "units" },
	{ item: "Water Purification Tablets", minLevel: 500, unitsLeft: 120, unit: "packs" },
	{ item: "Eco Sanitary Napkins", minLevel: 200, unitsLeft: 80, unit: "units" },
];

export const PENDING_APPROVALS = [
	{ pr: "PR-2024-089", date: "12 Oct", item: "Smart Classroom Projectors", requestedBy: "R. Sen" },
	{ pr: "PR-2024-090", date: "13 Oct", item: "Zinc Gluconate Supplements", requestedBy: "A. Patel" },
	{ pr: "PR-2024-091", date: "14 Oct", item: "Teacher Training Manuals", requestedBy: "K. Reddy" },
	{ pr: "PR-2024-092", date: "14 Oct", item: "Sports Gear Kit (Football)", requestedBy: "S. Khan" },
	{ pr: "PR-2024-093", date: "15 Oct", item: "Desktop Computers (Labs)", requestedBy: "R. Sen" },
];

export const SPEND_TREND = [
	{ month: "May", amount: 1500000 },
	{ month: "Jun", amount: 1850000 },
	{ month: "Jul", amount: 1600000 },
	{ month: "Aug", amount: 2100000 },
	{ month: "Sep", amount: 2485000 },
	{ month: "Oct", amount: 2200000 },
];
