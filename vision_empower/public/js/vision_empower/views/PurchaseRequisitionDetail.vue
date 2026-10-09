<script setup>
import { computed, ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";
import { callApi, uploadFile, formatInr, formatDate } from "../utils/api";

const route = useRoute();
const router = useRouter();

const prId = route.params.prId;
const pr = ref(null);

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
	completed: "Completed",
	rejected: "Rejected",
};

const ACTION_LABELS = {
	submitted: "submitted the request",
	approved: "approved",
	rejected: "rejected",
	quote_added: "added a quotation",
	quotations_closed: "closed quotation collection",
	vendor_selected: "selected the vendor",
	payment_approved: "approved payment",
	revision_requested: "requested a revision — sent back to Vendor Selection",
	payment_recorded: "recorded payment",
	dispatched: "dispatched",
	delivered: "confirmed delivery",
	attachment_added: "attached a document",
};

// Maps a pipeline stage to the real action page for that step, and the
// role allowed to act there.
const STAGE_ROUTES = {
	approval: { name: "procurement-approval", roles: PR_STEP_ROLES.approval },
	quotations: { name: "procurement-vendor-quotations", roles: PR_STEP_ROLES.quotation },
	"vendor-selection": { name: "procurement-vendor-selection", roles: PR_STEP_ROLES.vendorSelection },
	"payment-approval": { name: "procurement-payment-approval", roles: PR_STEP_ROLES.paymentApproval },
	payment: { name: "procurement-payment-recording", roles: PR_STEP_ROLES.payment },
	dispatch: { name: "dispatch-initiation", roles: PR_STEP_ROLES.dispatch },
	delivery: { name: "delivery-confirmation", roles: PR_STEP_ROLES.deliveryConfirmation },
};

const uploadingStage = ref("");

async function load() {
	pr.value = await callApi("get_purchase_requisition_status", { pr_id: prId });
}

onMounted(load);

const stage = computed(() => pr.value?.stage || "requisition");

// Completed = every step done; Rejected stops the trail at Approval.
const currentStageIndex = computed(() => {
	if (stage.value === "completed") return STAGE_ORDER.length;
	if (stage.value === "rejected") return STAGE_ORDER.indexOf("approval");
	return STAGE_ORDER.indexOf(stage.value);
});

// Vue templates can't reach the `frappe` global directly.
const formatDateTime = (value) => (value ? frappe.datetime.str_to_user(value) : "");

const fileName = (url) => decodeURIComponent((url || "").split("/").pop());

const timeline = computed(() =>
	STAGE_ORDER.map((stageId, index) => {
		const activity = (pr.value?.activity || []).filter((a) => a.stage === stageId);
		let status = index < currentStageIndex.value ? "done" : index === currentStageIndex.value ? "current" : "pending";
		const rejected = stage.value === "rejected" && stageId === "approval";
		if (rejected) status = "done";
		return {
			stage: stageId,
			rejected,
			label: STAGE_LABELS[stageId],
			status,
			activity,
			attachments: activity.filter((a) => a.attachment).map((a) => ({ name: fileName(a.attachment), url: a.attachment })),
		};
	})
);

const actionForCurrentStage = computed(() => STAGE_ROUTES[stage.value]);
const canActOnCurrentStage = computed(() =>
	actionForCurrentStage.value ? userHasAnyRole(actionForCurrentStage.value.roles) : false
);

function goToAction() {
	router.push({ name: actionForCurrentStage.value.name, params: { prId } });
}

function openAttachment(attachment) {
	window.open(attachment.url, "_blank");
}

function triggerUpload(stageId) {
	document.getElementById(`pr-upload-${stageId}`)?.click();
}

async function handleUpload(stageId, event) {
	const file = event.target.files?.[0];
	event.target.value = "";
	if (!file) return;

	uploadingStage.value = stageId;

	try {
		const fileDoc = await uploadFile(file);
		await callApi("add_pr_attachment", { pr_id: prId, file_url: fileDoc.file_url, stage: stageId });
		showToast({ message: `"${fileDoc.file_name}" attached.`, variant: "success" });
		await load();
	} catch (error) {
		console.error("Failed to upload attachment:", error);
		showToast({ message: "Failed to upload the file.", variant: "danger" });
	} finally {
		uploadingStage.value = "";
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>{{ prId }}</h2>
			<p class="ve-subtitle">{{ pr?.record.item }}</p>
		</div>

		<BaseWidget :loading="!pr">
			<template #header>
				<h2 class="ve-widget-title">Request Summary</h2>
			</template>

			<div v-if="pr" class="ve-selection-summary">
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Requested By</span>
					<span class="ve-selection-summary-value">{{ pr.record.requested_by }}</span>
				</div>
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Date</span>
					<span class="ve-selection-summary-value">{{ pr.record.date || "—" }}</span>
				</div>
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Quantity</span>
					<span class="ve-selection-summary-value">{{ pr.record.quantity }}</span>
				</div>
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Target Schools</span>
					<span class="ve-selection-summary-value">
						{{ pr.record.target_schools.map((s) => s.school_name || s.school).join(", ") || "—" }}
					</span>
				</div>
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Expected Delivery</span>
					<span class="ve-selection-summary-value">{{ formatDate(pr.record.required_by_date) || "—" }}</span>
				</div>
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Current Stage</span>
					<span class="ve-pill" :class="{ 've-pill--danger': stage === 'rejected' }">{{ STAGE_LABELS[stage] }}</span>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget v-if="pr && (pr.purchase_order || pr.dispatches.length)">
			<template #header>
				<h2 class="ve-widget-title">Documents</h2>
			</template>

			<div class="ve-selection-summary">
				<div v-if="pr.purchase_order" class="ve-selection-summary-item">
					<span class="ve-context-label">Purchase Order</span>
					<span class="ve-selection-summary-value">
						{{ pr.purchase_order.name }} · {{ pr.purchase_order.vendor_name }} · {{ formatInr(pr.purchase_order.total_amount) }}
					</span>
				</div>
				<div v-if="pr.vendor_invoice" class="ve-selection-summary-item">
					<span class="ve-context-label">Vendor Invoice</span>
					<span class="ve-selection-summary-value">
						{{ pr.vendor_invoice.invoice_number }} ({{ pr.vendor_invoice.match_status }})
					</span>
				</div>
				<div v-if="pr.payment" class="ve-selection-summary-item">
					<span class="ve-context-label">Payment</span>
					<span class="ve-selection-summary-value">
						{{ formatInr(pr.payment.amount) }} · {{ pr.payment.mode }} · UTR {{ pr.payment.utr_reference_number }}
					</span>
				</div>
				<div v-if="pr.dispatches.length" class="ve-selection-summary-item">
					<span class="ve-context-label">Delivery Challans</span>
					<span class="ve-selection-summary-value">
						<span v-for="dc in pr.dispatches" :key="dc.name" style="display: block">
							{{ dc.name }} → {{ dc.school_name || "—" }} ({{ dc.status }})
						</span>
					</span>
				</div>
				<div v-if="pr.discrepancies.length" class="ve-selection-summary-item">
					<span class="ve-context-label">Delivery Discrepancies</span>
					<span class="ve-selection-summary-value">
						<span
							v-for="d in pr.discrepancies"
							:key="d.name"
							class="ve-link"
							style="display: block"
							@click="router.push({ name: 'delivery-discrepancy-detail', params: { discrepancyId: d.name } })"
						>
							{{ d.dc_number }}: {{ d.item }} short by {{ d.shortage }}
						</span>
					</span>
				</div>
				<div v-if="pr.goods_receipt" class="ve-selection-summary-item">
					<span class="ve-context-label">Goods Receipt</span>
					<span class="ve-selection-summary-value">
						{{ pr.goods_receipt.name }} · {{ pr.goods_receipt.condition }}
					</span>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget v-if="pr">
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
							<span v-if="entry.rejected">✕</span>
							<span v-else-if="entry.status === 'done'">✓</span>
						</div>
						<div v-if="index < timeline.length - 1" class="ve-vtimeline-line" />
					</div>

					<div class="ve-vtimeline-body">
						<div class="ve-vtimeline-header">
							<span class="ve-vtimeline-label">{{ entry.label }}</span>
							<span v-if="entry.rejected" class="ve-pill ve-pill--danger">Rejected</span>
							<span v-else-if="entry.status === 'current'" class="ve-pill">In Progress</span>
						</div>

						<div v-if="!entry.activity.length" class="ve-vtimeline-meta">
							{{ entry.status === "pending" ? "Not reached yet" : "No activity recorded yet" }}
						</div>

						<div v-else class="ve-vtimeline-comments">
							<div v-for="(a, i) in entry.activity" :key="i" class="ve-vtimeline-comment">
								<span class="ve-vtimeline-comment-author">
									{{ a.performed_by }} {{ ACTION_LABELS[a.action] || a.action }}
									<span class="ve-vtimeline-comment-date">{{ formatDateTime(a.performed_at) }}</span>
								</span>
								<div v-if="a.remarks" class="ve-vtimeline-comment-text">{{ a.remarks }}</div>
							</div>
						</div>

						<div v-if="entry.attachments.length" class="ve-vtimeline-attachments">
							<div
								v-for="a in entry.attachments"
								:key="a.url"
								class="ve-vtimeline-attachment"
								@click="openAttachment(a)"
							>
								<span class="ve-vtimeline-attachment-icon">📄</span>
								<span class="ve-vtimeline-attachment-name">{{ a.name }}</span>
							</div>
						</div>

						<template v-if="entry.status !== 'pending'">
							<input
								:id="`pr-upload-${entry.stage}`"
								type="file"
								accept=".pdf,.jpg,.jpeg,.png"
								style="display: none"
								@change="handleUpload(entry.stage, $event)"
							/>
							<button
								class="ve-link-button"
								style="margin-top: 0.5rem"
								:disabled="uploadingStage === entry.stage"
								@click="triggerUpload(entry.stage)"
							>
								{{ uploadingStage === entry.stage ? "Uploading..." : "+ Attach Document" }}
							</button>
						</template>
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
					This request is waiting on your role at the {{ STAGE_LABELS[stage] }} step.
				</p>
				<div class="ve-form-actions" style="margin-top: 0.75rem">
					<button class="ve-button ve-button--primary" @click="goToAction">
						Go to {{ STAGE_LABELS[stage] }} →
					</button>
				</div>
			</template>
			<p v-else class="ve-subtitle">
				This request is currently waiting on another role at the {{ STAGE_LABELS[stage] }} step.
			</p>
		</BaseWidget>
	</div>
</template>
