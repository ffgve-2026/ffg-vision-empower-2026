<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ROLES, userHasAnyRole } from "../config/roles";
import { callApi } from "../utils/api";

const route = useRoute();

const transfer = ref({});
const loading = ref(false);
const error = ref("");

async function loadTransfer() {
	loading.value = true;
	error.value = "";

	try {
		const response = await frappe.call({
			method: "frappe.client.get",
			args: { doctype: "Location Transfer", name: route.params.transferId },
		});

		const data = response.message;
		if (!data) throw new Error("Transfer not found");

		transfer.value = data;
	} catch (err) {
		console.error("Failed to load transfer:", err);
		error.value = "Failed to load transfer.";
	} finally {
		loading.value = false;
	}
}

onMounted(loadTransfer);

// Client-side only — complete_location_transfer re-checks the role.
const canManage = userHasAnyRole([ROLES.ADMIN]);
const completing = ref(false);

async function markReceived() {
	completing.value = true;
	try {
		const result = await callApi("complete_location_transfer", { name: transfer.value.name });
		showToast({ message: result.message, variant: "success" });
		await loadTransfer();
	} catch (err) {
		showToast({ message: "Could not mark the transfer as received.", variant: "danger" });
		throw err;
	} finally {
		completing.value = false;
	}
}
</script>

<template>
	<div class="ve-view">
		<div v-if="loading" class="ve-pagination-note">Loading transfer...</div>
		<div v-else-if="error" class="ve-pagination-note">{{ error }}</div>

		<BaseWidget v-else>
			<template #header>
				<h2 class="ve-widget-title">{{ transfer.name }}</h2>
			</template>

			<div class="ve-detail-grid">
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Item</span>
					<span class="ve-detail-field-value">{{ transfer.item }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Quantity</span>
					<span class="ve-detail-field-value">{{ transfer.quantity }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">From Location</span>
					<span class="ve-detail-field-value">{{ transfer.from_location }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">To Location</span>
					<span class="ve-detail-field-value">{{ transfer.to_location }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Status</span>
					<span class="ve-status-text" :class="`ve-status-text--${transfer.status === 'Completed' ? 'active' : 'inactive'}`">
						{{ transfer.status }}
					</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Approved By</span>
					<span class="ve-detail-field-value">{{ transfer.approved_by || "-" }}</span>
				</div>
				<div class="ve-detail-field" style="grid-column: 1 / -1">
					<span class="ve-detail-field-label">Reason</span>
					<span class="ve-detail-field-value">{{ transfer.reason || "-" }}</span>
				</div>
			</div>

			<div v-if="canManage && transfer.status !== 'Completed'" class="ve-form-actions" style="margin-top: 1rem">
				<button class="ve-button ve-button--primary" :disabled="completing" @click="markReceived">
					{{ completing ? "Saving..." : "Mark Received" }}
				</button>
			</div>
		</BaseWidget>
	</div>
</template>
