<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();

const prId = route.params.prId;
const item = route.query.item || "(unknown item)";
const requestedBy = route.query.requestedBy || "(unknown requester)";
const date = route.query.date || "";
const stage = route.query.stage || "requisition";

// Ordered so an "activity so far" trail can be derived from wherever the
// PR currently sits — mirrors ProcurementPipeline's own stage list.
const STAGE_ORDER = [
	"requisition",
	"approval",
	"quotations",
	"vendor-selection",
	"payment-approval",
	"payment",
	"dispatch",
	"delivery",
];

const STAGE_LABELS = {
	requisition: "Requisition",
	approval: "Approval",
	quotations: "Quotation Collection",
	"vendor-selection": "Vendor Selection",
	"payment-approval": "Payment Approval",
	payment: "Payment Processing",
	dispatch: "Dispatch",
	delivery: "Delivery Confirmation",
};

// Which role acted at each stage, and the action verb — mock audit trail,
// not real history (no Purchase Requisition Activity log exists yet).
const STAGE_ACTORS = {
	requisition: { role: "Field User", verb: "submitted" },
	approval: { role: "Senior Manager", verb: "approved" },
	quotations: { role: "Admin", verb: "collected quotations for" },
	"vendor-selection": { role: "Admin", verb: "selected a vendor for" },
	"payment-approval": { role: "Finance", verb: "approved payment for" },
	payment: { role: "Finance", verb: "recorded payment for" },
	dispatch: { role: "Admin", verb: "confirmed dispatch for" },
	delivery: { role: "Field User", verb: "confirmed delivery for" },
};

// Maps a pipeline stage to the real action page for that step, and the
// role allowed to act there — reuses the routes already built for steps
// 1-8 rather than duplicating them.
const STAGE_ROUTES = {
	approval: { name: "procurement-approval", roles: PR_STEP_ROLES.approval },
	quotations: { name: "procurement-vendor-quotations", roles: PR_STEP_ROLES.quotation },
	"vendor-selection": { name: "procurement-vendor-selection", roles: PR_STEP_ROLES.vendorSelection },
	"payment-approval": { name: "procurement-payment-approval", roles: PR_STEP_ROLES.paymentApproval },
	payment: { name: "procurement-payment-recording", roles: PR_STEP_ROLES.payment },
	dispatch: { name: "dispatch-initiation", roles: PR_STEP_ROLES.dispatch },
	delivery: { name: "delivery-confirmation", roles: PR_STEP_ROLES.deliveryConfirmation },
};

const currentStageIndex = STAGE_ORDER.indexOf(stage);

// Every stage up to and including the current one — the audit trail.
const activity = computed(() =>
	STAGE_ORDER.slice(0, currentStageIndex + 1).map((stageId) => ({
		stage: stageId,
		label: STAGE_LABELS[stageId],
		...STAGE_ACTORS[stageId],
	}))
);

const actionForCurrentStage = STAGE_ROUTES[stage];
const canActOnCurrentStage = actionForCurrentStage
	? userHasAnyRole(actionForCurrentStage.roles)
	: false;

function goToAction() {
	router.push({
		name: actionForCurrentStage.name,
		params: { prId },
		query: { item, requestedBy, date },
	});
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>{{ prId }}</h2>
			<p class="ve-subtitle">{{ item }}</p>
		</div>

		<ProcurementPipeline :currentStage="stage" />

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Request Summary</h2>
			</template>

			<div class="ve-selection-summary">
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Requested By</span>
					<span class="ve-selection-summary-value">{{ requestedBy }}</span>
				</div>
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Date</span>
					<span class="ve-selection-summary-value">{{ date || "—" }}</span>
				</div>
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Current Stage</span>
					<span class="ve-pill">{{ STAGE_LABELS[stage] }}</span>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Activity Timeline</h2>
			</template>

			<div v-for="entry in activity" :key="entry.stage" class="ve-alert-row">
				<div>
					<div class="ve-alert-item">{{ entry.label }}</div>
					<div class="ve-subtitle">{{ entry.role }} {{ entry.verb }} this request</div>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget v-if="actionForCurrentStage">
			<template #header>
				<h2 class="ve-widget-title">Action</h2>
			</template>

			<template v-if="canActOnCurrentStage">
				<p class="ve-subtitle">
					This request is waiting on your role at the
					{{ STAGE_LABELS[stage] }} step.
				</p>
				<div class="ve-form-actions" style="margin-top: 0.75rem">
					<button class="ve-button ve-button--primary" @click="goToAction">
						Go to {{ STAGE_LABELS[stage] }} →
					</button>
				</div>
			</template>
			<p v-else class="ve-subtitle">
				This request is currently waiting on another role at the
				{{ STAGE_LABELS[stage] }} step.
			</p>
		</BaseWidget>
	</div>
</template>
