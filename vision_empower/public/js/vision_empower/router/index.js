import { createRouter, createWebHashHistory } from "vue-router";

import { ALL_ROLES, FLAT_NAV_ITEMS, userHasAnyRole } from "../config/roles";
import Dashboard from "../views/Dashboard.vue";
import RolePlaceholder from "../views/RolePlaceholder.vue";
import Forbidden from "../views/Forbidden.vue";
import RequisitionInitiation from "../views/RequisitionInitiation.vue";
import Approval from "../views/Approval.vue";
import VendorQuotations from "../views/VendorQuotations.vue";
import VendorSelection from "../views/VendorSelection.vue";
import PaymentApproval from "../views/PaymentApproval.vue";
import PaymentRecord from "../views/PaymentRecord.vue";
import DispatchInitiation from "../views/DispatchInitiation.vue";
import DeliveryConfirmation from "../views/DeliveryConfirmation.vue";
import PurchaseRequisitionDetail from "../views/PurchaseRequisitionDetail.vue";
import VendorList from "../views/VendorList.vue";
import VendorDetail from "../views/VendorDetail.vue";
import SchoolList from "../views/SchoolList.vue";
import SchoolDetail from "../views/SchoolDetail.vue";
import ItemList from "../views/ItemList.vue";
import ItemDetail from "../views/ItemDetail.vue";
import KitList from "../views/KitList.vue";
import KitDetail from "../views/KitDetail.vue";
import LocationTransfer from "../views/LocationTransfer.vue";
import DeliveryDiscrepancyLog from "../views/DeliveryDiscrepancyLog.vue";
import ProcurementSummaryReport from "../views/ProcurementSummaryReport.vue";
import StockStatusReport from "../views/StockStatusReport.vue";
import DispatchStatusReport from "../views/DispatchStatusReport.vue";
import PurchaseRequisitionList from "../views/PurchaseRequisitionList.vue";

// Sidebar nav items that now have a real page instead of RolePlaceholder.
// Add to this map as more modules get built (see CLAUDE.md).
const componentsByRouteName = {
	dashboard: Dashboard,
	vendors: VendorList,
	schools: SchoolList,
	items: ItemList,
	kits: KitList,
	procurement: PurchaseRequisitionList,
	inventory: LocationTransfer,
	dispatch: DeliveryDiscrepancyLog,
	"report-procurement-summary": ProcurementSummaryReport,
	"report-stock-status": StockStatusReport,
	"report-dispatch-status": DispatchStatusReport,
};

const routes = FLAT_NAV_ITEMS.map((item) => {
	const component = componentsByRouteName[item.name] || RolePlaceholder;
	return {
		path: item.path,
		name: item.name,
		component,
		props: component === RolePlaceholder ? { title: item.label } : false,
		meta: { roles: item.roles, breadcrumb: item.breadcrumb },
	};
});

// Master Data detail pages — not sidebar links, reached by clicking a row
// in the matching list page.
routes.push({
	path: "/master-data/vendors/:vendorId",
	name: "vendor-detail",
	component: VendorDetail,
	meta: { roles: ALL_ROLES, breadcrumb: ["Master Data", "Vendors"] },
});
routes.push({
	path: "/master-data/schools/:schoolId",
	name: "school-detail",
	component: SchoolDetail,
	meta: { roles: ALL_ROLES, breadcrumb: ["Master Data", "Schools"] },
});
routes.push({
	path: "/master-data/items/:itemId",
	name: "item-detail",
	component: ItemDetail,
	meta: { roles: ALL_ROLES, breadcrumb: ["Master Data", "Items"] },
});
routes.push({
	path: "/master-data/kits/:kitId",
	name: "kit-detail",
	component: KitDetail,
	meta: { roles: ALL_ROLES, breadcrumb: ["Master Data", "Kits"] },
});

// Purchase Requisition steps 1-2 — not sidebar links, reached by navigating
// from the Dashboard's "Create PR" / Approve / Reject actions. Steps 3-8
// don't have pages yet (see CLAUDE.md). Viewable by all 4 roles per the
// spec ("other steps are view-only") — actual action buttons are gated
// inside each component via PR_STEP_ROLES, and for real by the backend.
routes.push({
	path: "/procurement/new",
	name: "procurement-new-requisition",
	component: RequisitionInitiation,
	meta: { roles: ALL_ROLES, breadcrumb: ["Procurement", "New Requisition"] },
});
routes.push({
	path: "/procurement/:prId/approval",
	name: "procurement-approval",
	component: Approval,
	meta: { roles: ALL_ROLES, breadcrumb: ["Procurement", "Approval"] },
});
routes.push({
	path: "/procurement/:prId/vendor/quotations",
	name: "procurement-vendor-quotations",
	component: VendorQuotations,
	meta: { roles: ALL_ROLES, breadcrumb: ["VendorQuotations"] },
});
routes.push({
	path: "/procurement/:prId/vendor/selection",
	name: "procurement-vendor-selection",
	component: VendorSelection,
	meta: { roles: ALL_ROLES, breadcrumb: ["VendorSelection"] },
});
routes.push({
	path: "/procurement/:prId/payment/approval",
	name: "procurement-payment-approval",
	component: PaymentApproval,
	meta: { roles: ALL_ROLES, breadcrumb: ["PaymentApproval"] },
});
routes.push({
	path: "/procurement/:prId/payment/recording",
	name: "procurement-payment-recording",
	component: PaymentRecord,
	meta: { roles: ALL_ROLES, breadcrumb: ["PaymentRecord"] },
});
routes.push({
	path: "/dispatch/initiation/:prId",
	name: "dispatch-initiation",
	component: DispatchInitiation,
	meta: { roles: ALL_ROLES, breadcrumb: ["DispatchInitiation"] },
});
routes.push({
	path: "/delivery/confirmation/:prId",
	name: "delivery-confirmation",
	component: DeliveryConfirmation,
	meta: { roles: ALL_ROLES, breadcrumb: ["DeliveryConfirmation"] },
});
// Universal PR status/audit-trail page — every role can view it (see the
// Dashboard's "Procurement Requests" widget), regardless of whether it's
// their turn to act. See PurchaseRequisitionDetail.vue.
routes.push({
	path: "/procurement/:prId/status",
	name: "procurement-status",
	component: PurchaseRequisitionDetail,
	meta: { roles: ALL_ROLES, breadcrumb: ["Procurement", "Status"] },
});

routes.push({ path: "/forbidden", name: "forbidden", component: Forbidden, meta: {} });
routes.push({ path: "/:pathMatch(.*)*", redirect: { name: "forbidden" } });

export function createAppRouter() {
	const router = createRouter({
		history: createWebHashHistory(),
		routes,
	});

	// UX convenience only — see config/roles.js for why this isn't security.
	router.beforeEach((to) => {
		if (to.name === "forbidden" || !to.meta.roles) return true;
		return userHasAnyRole(to.meta.roles) || { name: "forbidden" };
	});

	return router;
}
