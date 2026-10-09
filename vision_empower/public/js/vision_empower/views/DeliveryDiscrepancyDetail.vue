<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";

const route = useRoute();
const router = useRouter();

function openPr() {
	router.push({
		name: "procurement-status",
		params: { prId: discrepancy.value.procurement_requisition },
	});
}

const discrepancy = ref({});
const loading = ref(false);
const error = ref("");

async function loadDiscrepancy() {
	loading.value = true;
	error.value = "";

	try {
		const response = await frappe.call({
			method: "frappe.client.get",
			args: { doctype: "Delivery Discrepancy", name: route.params.discrepancyId },
		});

		const data = response.message;
		if (!data) throw new Error("Discrepancy not found");

		discrepancy.value = data;
	} catch (err) {
		console.error("Failed to load discrepancy:", err);
		error.value = "Failed to load discrepancy.";
	} finally {
		loading.value = false;
	}
}

onMounted(loadDiscrepancy);
</script>

<template>
	<div class="ve-view">
		<div v-if="loading" class="ve-pagination-note">Loading discrepancy...</div>
		<div v-else-if="error" class="ve-pagination-note">{{ error }}</div>

		<BaseWidget v-else>
			<template #header>
				<h2 class="ve-widget-title">{{ discrepancy.dc_number }}</h2>
			</template>

			<div class="ve-detail-grid">
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Delivery Challan</span>
					<span class="ve-detail-field-value">{{ discrepancy.dc_number }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Procurement Request</span>
					<span class="ve-detail-field-value">
						<span
							v-if="discrepancy.procurement_requisition"
							class="ve-link"
							@click="openPr"
							>{{ discrepancy.procurement_requisition }}</span
						>
						<template v-else>-</template>
					</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">School</span>
					<span class="ve-detail-field-value">{{ discrepancy.school }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Item</span>
					<span class="ve-detail-field-value">{{ discrepancy.item }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Expected Quantity</span>
					<span class="ve-detail-field-value">{{ discrepancy.expected_qty }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Received Quantity</span>
					<span class="ve-detail-field-value">{{ discrepancy.received_qty }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Shortage</span>
					<span class="ve-detail-field-value">{{ discrepancy.shortage }}</span>
				</div>
				<div class="ve-detail-field" style="grid-column: 1 / -1">
					<span class="ve-detail-field-label">Action Taken</span>
					<span class="ve-detail-field-value">{{
						discrepancy.action_taken || "-"
					}}</span>
				</div>
			</div>
		</BaseWidget>
	</div>
</template>
