<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();
const submitting = ref(false);

// Client-side only — hides the form for roles that can't raise a request.
// The backend independently enforces the same role on the actual
// submit_purchase_requisition call, which is the real security boundary.
const canSubmit = userHasAnyRole(PR_STEP_ROLES.requisition);

// No Kit Master DocType yet — mirrors the spec's sample kit names.
const KIT_TYPES = [
	"CT Learning Kit — Primary",
	"Primary Math Learning Kit (Class 1-5)",
	"Secondary Physics Lab Setup Kit",
	"Braille Special Resource Kit Pro",
];

const form = ref({
	kitType: KIT_TYPES[0],
	quantity: "",
	targetSchools: "",
	expectedDelivery: "",
});

async function submit() {
	submitting.value = true;

	try {
		const response = await frappe.call({
			method: "vision_empower.vision_empower.api.submit_purchase_requisition",
			args: {
				kit_type: form.value.kitType,
				quantity: form.value.quantity,
				target_schools: form.value.targetSchools,
				expected_delivery: form.value.expectedDelivery,
			},
		});

		const pr = response.message;
		showToast({ message: pr.message, variant: "success" });

		router.push({
			name: "procurement-approval",
			params: { prId: pr.pr_id },
			query: { item: pr.item, requestedBy: pr.requested_by, date: pr.date },
		});
	} catch (error) {
		showToast({ message: "Could not submit the requisition.", variant: "danger" });
		throw error;
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Purchase Requisition — Initiation</h2>
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Requisition Details</h2>
			</template>

			<form v-if="canSubmit" class="ve-form-grid" @submit.prevent="submit">
				<div class="ve-field">
					<label class="ve-field-label">Kit Type</label>
					<select v-model="form.kitType" class="ve-field-input">
						<option v-for="kit in KIT_TYPES" :key="kit" :value="kit">{{ kit }}</option>
					</select>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Quantity</label>
					<input v-model="form.quantity" class="ve-field-input" type="text" placeholder="e.g. 150 Kits" required />
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Target Schools</label>
					<input
						v-model="form.targetSchools"
						class="ve-field-input"
						type="text"
						placeholder="e.g. 15 Schools (Bihar)"
						required
					/>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Expected Delivery</label>
					<input v-model="form.expectedDelivery" class="ve-field-input" type="date" required />
				</div>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button type="submit" class="ve-button ve-button--primary" :disabled="submitting">
						{{ submitting ? "Submitting..." : "Submit for Approval" }}
					</button>
				</div>
			</form>

			<p v-else class="ve-subtitle">
				Your role doesn't raise requisitions — this step is view-only for you.
			</p>
		</BaseWidget>
	</div>
</template>
