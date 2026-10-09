<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { callApi, formatInr } from "../utils/api";

const route = useRoute();
const router = useRouter();

const prId = route.params.prId;
const pr = ref(null);

const remarks = ref("");
const deciding = ref(false);

// Client-side only — hides the buttons for roles that can't act on this
// step. The backend independently enforces the same role on the actual
// decide_purchase_requisition call, which is the real security boundary.
const canDecide = userHasAnyRole(PR_STEP_ROLES.approval);

async function load() {
	pr.value = await callApi("get_purchase_requisition_status", { pr_id: prId });
}

onMounted(load);

async function decide(decision) {
	deciding.value = true;

	try {
		const result = await callApi("decide_purchase_requisition", {
			pr_id: prId,
			decision,
			remarks: remarks.value,
		});

		showToast({
			message: result.message,
			variant: decision === "approve" ? "success" : "danger",
		});
		router.push({ name: "procurement-status", params: { prId } });
	} catch (error) {
		showToast({ message: "Could not record the decision.", variant: "danger" });
		throw error;
	} finally {
		deciding.value = false;
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Purchase Requisition — Approval</h2>
		</div>

		<ProcurementPipeline currentStage="approval" />

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Approval Decision</h2>
			</template>

			<template v-if="pr">
				<p class="ve-subtitle">
					{{ prId }}: {{ pr.record.item }} × {{ pr.record.quantity }} — requested by
					{{ pr.record.requested_by }}<span v-if="pr.record.date"> on {{ pr.record.date }}</span>.
				</p>

				<div class="ve-detail-grid" style="margin-top: 1rem">
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Target Schools</span>
						<span class="ve-detail-field-value">
							{{ pr.record.target_schools.map((s) => s.school_name || s.school).join(", ") || "—" }}
						</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Expected Delivery</span>
						<span class="ve-detail-field-value">{{ pr.record.required_by_date || "—" }}</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Estimated Value</span>
						<span class="ve-detail-field-value">{{ formatInr(pr.record.estimated_value) }}</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Fund</span>
						<span class="ve-detail-field-value">{{ pr.record.fund || "—" }}</span>
					</div>
				</div>
			</template>

			<p v-if="pr && pr.stage !== 'approval'" class="ve-subtitle" style="margin-top: 1rem">
				This requisition is at "{{ pr.stage_label }}" — no approval decision is pending.
			</p>

			<template v-else-if="pr && canDecide">
				<div class="ve-field" style="margin-top: 1rem">
					<label class="ve-field-label">Remarks (optional)</label>
					<textarea v-model="remarks" class="ve-field-textarea" />
				</div>

				<div class="ve-form-actions" style="margin-top: 1rem">
					<button
						class="ve-button ve-button--success"
						:disabled="deciding"
						@click="decide('approve')"
					>
						Approve
					</button>
					<button
						class="ve-button ve-button--danger"
						:disabled="deciding"
						@click="decide('reject')"
					>
						Reject
					</button>
				</div>
			</template>

			<p v-else-if="pr" class="ve-subtitle" style="margin-top: 1rem">
				Your role doesn't approve requisitions — this step is view-only for you.
			</p>
		</BaseWidget>
	</div>
</template>
