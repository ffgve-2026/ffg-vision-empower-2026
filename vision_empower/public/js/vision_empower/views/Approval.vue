<script setup>
import { ref } from "vue";
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

const remarks = ref("");
const deciding = ref(false);

// Client-side only — hides the buttons for roles that can't act on this
// step. The backend independently enforces the same role on the actual
// decide_purchase_requisition call, which is the real security boundary.
const canDecide = userHasAnyRole(PR_STEP_ROLES.approval);

async function decide(decision) {
	deciding.value = true;

	try {
		const response = await frappe.call({
			method: "vision_empower.vision_empower.api.decide_purchase_requisition",
			args: { pr_id: prId, decision, remarks: remarks.value },
		});

		showToast({
			message: response.message.message,
			variant: decision === "approve" ? "success" : "danger",
		});
		router.push({ name: "dashboard" });
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

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Approval Decision</h2>
			</template>

			<p class="ve-subtitle">
				{{ prId }}: {{ item }} — requested by {{ requestedBy }}<span v-if="date"> on {{ date }}</span>.
			</p>

			<template v-if="canDecide">
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

			<p v-else class="ve-subtitle" style="margin-top: 1rem">
				Your role doesn't approve requisitions — this step is view-only for you.
			</p>
		</BaseWidget>
	</div>
</template>
