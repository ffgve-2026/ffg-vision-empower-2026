<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();

const prId = route.params.prId || "PR-00024";

// Client-side only — hides the confirmation form for roles that can't act
// on this step. The backend independently enforces the same role on the
// actual select_vendor call, which is the real security boundary.
const canAct = userHasAnyRole(PR_STEP_ROLES.vendorSelection);

const vendor = ref({
	name: "ABC Educational Supplies",
	quotationRef: "QT-1024",
	quotationDate: "18 Sep 2026",
	totalAmount: 235000,
	deliveryDays: 10,
	validUntil: "18 Oct 2026",
});

const order = ref({
	kitType: "CT Learning Kit — Primary",
	quantity: "150 Kits",
	targetSchools: "15 Schools (Bihar)",
	expectedDelivery: "30 Sep 2026",
});

const justification = ref("");
const submitting = ref(false);

const formattedAmount = (amount) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(amount);

async function confirmSelection() {
	if (!justification.value.trim()) {
		showToast({
			message: "Please provide a justification for selecting this vendor.",
			variant: "danger",
		});
		return;
	}

	submitting.value = true;

	try {
		// TODO: Replace with the actual Frappe API call.
		// await frappe.call({
		// 	method: "vision_empower.vision_empower.api.select_vendor",
		// 	args: {
		// 		pr_id: prId,
		// 		vendor: vendor.value.name,
		// 		justification: justification.value,
		// 	},
		// });

		showToast({
			message: `${vendor.value.name} selected successfully.`,
			variant: "success",
		});

		// Temporary navigation until the Purchase Order page is created.
		router.push({
			name: "procurement-payment-approval",
            params: {
		        prId,
	        },	
        });
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
						Approved
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

			<template v-if="canAct">
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

			<p v-else class="ve-subtitle">
				Your role doesn't select vendors — this step is view-only for you.
			</p>
		</BaseWidget>
	</div>
</template>