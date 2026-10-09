<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";
import { callApi, formatInr, formatDate } from "../utils/api";

const route = useRoute();
const router = useRouter();

const prId = route.params.prId;

// Client-side only — hides the confirmation form for roles that can't act
// on this step. The backend independently enforces the same role on the
// actual select_vendor call, which is the real security boundary.
const canAct = userHasAnyRole(PR_STEP_ROLES.vendorSelection);

const pr = ref(null);

onMounted(async () => {
	pr.value = await callApi("get_purchase_requisition_status", { pr_id: prId });
});

// The quote picked on the Quotations page (?quotation=), else the one
// already selected, else the cheapest.
const quotation = computed(() => {
	if (!pr.value) return null;
	const all = pr.value.quotations;
	return (
		all.find((q) => q.name === route.query.quotation) ||
		pr.value.selected_quotation ||
		all[0] ||
		null
	);
});

const isOpen = computed(() => pr.value?.stage === "vendor-selection");

const vendor = computed(() => ({
	name: quotation.value?.vendor_name || "—",
	quotationRef: quotation.value?.quote_ref || quotation.value?.name || "",
	quotationDate: formatDate(quotation.value?.quotation_date),
	totalAmount: quotation.value?.total_amount || 0,
	deliveryDays: quotation.value?.delivery_days || 0,
	validUntil: formatDate(quotation.value?.valid_until) || "—",
}));

const order = computed(() => ({
	kitType: pr.value?.record.item || "",
	quantity: pr.value?.record.quantity || "",
	targetSchools: (pr.value?.record.target_schools || []).map((s) => s.school_name || s.school).join(", ") || "—",
	expectedDelivery: formatDate(pr.value?.record.required_by_date) || "—",
}));

const justification = ref("");
const submitting = ref(false);

const formattedAmount = formatInr;

async function confirmSelection() {
	if (!justification.value.trim()) {
		showToast({
			message: "Please provide a justification for selecting this vendor.",
			variant: "danger",
		});
		return;
	}
	if (!quotation.value) {
		showToast({ message: "No quotation to select — add one first.", variant: "danger" });
		return;
	}

	submitting.value = true;

	try {
		const result = await callApi("select_vendor", {
			pr_id: prId,
			quotation: quotation.value.name,
			justification: justification.value,
		});

		showToast({ message: result.message, variant: "success" });
		router.push({ name: "procurement-status", params: { prId } });
	} catch (error) {
		showToast({
			message: "Could not confirm the vendor selection.",
			variant: "danger",
		});
		throw error;
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Vendor Selection</h2>

			<p class="ve-subtitle">
				Confirm the selected vendor for procurement request {{ prId }}
			</p>
		</div>
		<ProcurementPipeline currentStage="vendor-selection" />

		<!-- Selected Vendor -->
		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Selected Vendor</h2>
			</template>

			<div class="ve-selection-layout">
				<div class="ve-selection-vendor">
					<span class="ve-context-label">Vendor</span>

					<div class="ve-selection-vendor-name">
						{{ vendor.name }}
					</div>

					<div class="ve-selection-vendor-meta">
						Quotation {{ vendor.quotationRef }}
						· {{ vendor.quotationDate }}
					</div>
				</div>

				<div class="ve-selection-vendor">
					<span class="ve-context-label">Quotation Amount</span>

					<div class="ve-selection-vendor-name">
						{{ formattedAmount(vendor.totalAmount) }}
					</div>

					<div class="ve-selection-vendor-meta">
						{{ vendor.deliveryDays }} day delivery
						· Valid until {{ vendor.validUntil }}
					</div>
				</div>
			</div>
		</BaseWidget>

		<!-- Order Summary -->
		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Order Summary</h2>
					<p class="ve-subtitle">
						Procurement request {{ prId }}
					</p>
				</div>
			</template>

			<div class="ve-selection-summary">
				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Kit Type</span>
					<span class="ve-selection-summary-value">
						{{ order.kitType }}
					</span>
				</div>

				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Quantity</span>
					<span class="ve-selection-summary-value">
						{{ order.quantity }}
					</span>
				</div>

				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Target Schools</span>
					<span class="ve-selection-summary-value">
						{{ order.targetSchools }}
					</span>
				</div>

				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Expected Delivery</span>
					<span class="ve-selection-summary-value">
						{{ order.expectedDelivery }}
					</span>
				</div>

				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Total Quotation</span>
					<span class="ve-selection-summary-value ve-selection-summary-value--strong">
						{{ formattedAmount(vendor.totalAmount) }}
					</span>
				</div>

				<div class="ve-selection-summary-item">
					<span class="ve-context-label">Procurement Status</span>
					<span class="ve-status ve-status--success">
						{{ pr?.stage_label }}
					</span>
				</div>
			</div>
		</BaseWidget>

		<!-- Justification -->
		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Vendor Selection Justification</h2>
					<p class="ve-subtitle">
						Please provide the reason for selecting this vendor.
					</p>
				</div>
			</template>

			<template v-if="canAct && isOpen">
				<div class="ve-selection-justification">
					<label class="ve-field-label" for="justification">
						Justification
					</label>

					<textarea
						id="justification"
						v-model="justification"
						placeholder="e.g. Selected based on competitive pricing, shorter delivery timeline and previous successful fulfilment..."
						required
					></textarea>
				</div>

				<div class="ve-selection-note" style="margin-top: 1rem;">
					The vendor selection and justification will be recorded against
					{{ prId }}.
				</div>

				<div class="ve-selection-actions">
					<button
						type="button"
						class="ve-button ve-button--primary"
						:disabled="submitting"
						@click="confirmSelection"
					>
						{{ submitting ? "Confirming..." : "Confirm Vendor Selection" }}
					</button>
				</div>
			</template>

			<p v-else-if="pr && !isOpen" class="ve-subtitle">
				Vendor selection isn't open — this request is at "{{ pr.stage_label }}".
			</p>

			<p v-else class="ve-subtitle">
				Your role doesn't select vendors — this step is view-only for you.
			</p>
		</BaseWidget>
	</div>
</template>