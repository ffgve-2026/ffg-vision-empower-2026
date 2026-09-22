<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();

const prId = route.params.prId;
const item = route.query.item || "(unknown item)";
const requestedBy = route.query.requestedBy || "(unknown requester)";
const date = route.query.date || "";
const stage = route.query.stage || "requisition";

// Ordered so the full 8-stage trail can be rendered top-to-bottom with a
// done/current/pending status for each, regardless of where the PR
// currently sits.
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

// Mock comments/attachments per stage — not every stage has either.
// Once a real Purchase Requisition + Activity/Comment/Attachment
// DocType lands, this is the shape to replace with real records fetched
// per prId (see CLAUDE.md — API integration is out of scope here).
const STAGE_COMMENTS = {
	requisition: [
		{ author: "R. Sen (Field User)", date: "02 Sep", text: "Urgent — school term starts in 2 weeks, requesting expedited approval." },
	],
	approval: [
		{ author: "A. Iyer (Senior Manager)", date: "03 Sep", text: "Approved — within this quarter's allocated budget for the district." },
	],
	quotations: [
		{ author: "K. Rao (Admin)", date: "05 Sep", text: "3 quotes collected, Apex Educational Supplies is lowest for the full set." },
	],
	"payment-approval": [
		{ author: "M. Das (Finance)", date: "08 Sep", text: "Payment approved against PO-2026-0112, releasing to Accounts." },
	],
	delivery: [
		{ author: "R. Sen (Field User)", date: "12 Sep", text: "Delivered and signed for by the school's SPOC, no discrepancies." },
	],
};

const STAGE_ATTACHMENTS = {
	requisition: [{ name: "requisition-form.pdf", size: "184 KB" }],
	quotations: [
		{ name: "quote-apex-supplies.pdf", size: "212 KB" },
		{ name: "quote-stem-learning.pdf", size: "198 KB" },
	],
	payment: [{ name: "payment-receipt.pdf", size: "96 KB" }],
	delivery: [{ name: "delivery-signed-copy.pdf", size: "310 KB" }],
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

// The full 8-stage vertical trail — every stage, each flagged done /
// current / pending relative to where the PR sits today.
const timeline = computed(() =>
	STAGE_ORDER.map((stageId, index) => ({
		stage: stageId,
		label: STAGE_LABELS[stageId],
		status: index < currentStageIndex ? "done" : index === currentStageIndex ? "current" : "pending",
		actor: index <= currentStageIndex ? STAGE_ACTORS[stageId] : null,
		comments: STAGE_COMMENTS[stageId] || [],
		attachments: STAGE_ATTACHMENTS[stageId] || [],
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

function openAttachment(name) {
	showToast({ message: `Previewing "${name}" isn't wired up yet.`, variant: "warning" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>{{ prId }}</h2>
			<p class="ve-subtitle">{{ item }}</p>
		</div>

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
				<h2 class="ve-widget-title">Audit Trail</h2>
			</template>

			<div class="ve-vtimeline">
				<div
					v-for="(entry, index) in timeline"
					:key="entry.stage"
					class="ve-vtimeline-item"
					:class="`ve-vtimeline-item--${entry.status}`"
				>
					<div class="ve-vtimeline-marker">
						<div class="ve-vtimeline-dot">
							<span v-if="entry.status === 'done'">✓</span>
						</div>
						<div v-if="index < timeline.length - 1" class="ve-vtimeline-line" />
					</div>

					<div class="ve-vtimeline-body">
						<div class="ve-vtimeline-header">
							<span class="ve-vtimeline-label">{{ entry.label }}</span>
							<span v-if="entry.status === 'current'" class="ve-pill">In Progress</span>
						</div>

						<div v-if="entry.actor" class="ve-vtimeline-meta">
							{{ entry.actor.role }} {{ entry.actor.verb }} this request
						</div>
						<div v-else class="ve-vtimeline-meta">Not reached yet</div>

						<div v-if="entry.comments.length" class="ve-vtimeline-comments">
							<div v-for="(c, i) in entry.comments" :key="i" class="ve-vtimeline-comment">
								<span class="ve-vtimeline-comment-author">
									{{ c.author }}
									<span class="ve-vtimeline-comment-date">{{ c.date }}</span>
								</span>
								<div class="ve-vtimeline-comment-text">{{ c.text }}</div>
							</div>
						</div>

						<div v-if="entry.attachments.length" class="ve-vtimeline-attachments">
							<div
								v-for="a in entry.attachments"
								:key="a.name"
								class="ve-vtimeline-attachment"
								@click="openAttachment(a.name)"
							>
								<span class="ve-vtimeline-attachment-icon">📄</span>
								<span class="ve-vtimeline-attachment-name">{{ a.name }}</span>
								<span class="ve-vtimeline-attachment-size">{{ a.size }}</span>
							</div>
						</div>
					</div>
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
