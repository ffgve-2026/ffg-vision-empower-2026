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

const routes = FLAT_NAV_ITEMS.map((item) => ({
	path: item.path,
	name: item.name,
	component: item.name === "dashboard" ? Dashboard : RolePlaceholder,
	props: item.name === "dashboard" ? false : { title: item.label },
	meta: { roles: item.roles, breadcrumb: item.breadcrumb },
}));

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
