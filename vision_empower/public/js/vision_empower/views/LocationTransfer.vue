<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();

// Client-side only — Inventory ownership isn't explicit in the original
// role breakdown; Admin is the closest fit (see the API contract's
// "assumptions to confirm"). The backend independently enforces the same
// role via frappe.only_for in submit_location_transfer.
const canSubmit = userHasAnyRole([ROLES.ADMIN]);

const items = ref([]);
const warehouses = ref([]);
const transfers = ref([]);
const loadingOptions = ref(false);
const loadingTransfers = ref(false);
const submitting = ref(false);

const form = ref({
	item: "",
	quantity: "",
	fromLocation: "",
	toLocation: "",
	reason: "",
});

async function loadOptions() {
	loadingOptions.value = true;

	try {
		const [itemsResponse, warehousesResponse] = await Promise.all([
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Item",
					fields: ["name", "item_name"],
					filters: { active: 1 },
					order_by: "item_name asc",
					limit_page_length: 200,
				},
			}),
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Warehouse",
					fields: ["name", "warehouse_name"],
					filters: { active: 1 },
					order_by: "warehouse_name asc",
					limit_page_length: 100,
				},
			}),
		]);

		items.value = itemsResponse.message || [];
		warehouses.value = warehousesResponse.message || [];
		if (items.value.length) form.value.item = items.value[0].name;
	} catch (error) {
		console.error("Failed to load Items/Warehouses:", error);
		showToast({ message: "Could not load Item/Warehouse options.", variant: "danger" });
	} finally {
		loadingOptions.value = false;
	}
}

async function loadTransfers() {
	loadingTransfers.value = true;

	try {
		const response = await frappe.call({
			method: "vision_empower.vision_empower.api.list_location_transfers",
		});
		transfers.value = response.message || [];
	} catch (error) {
		console.error("Failed to load transfers:", error);
		showToast({ message: "Could not load recent transfers.", variant: "danger" });
	} finally {
		loadingTransfers.value = false;
	}
}

onMounted(() => {
	loadOptions();
	loadTransfers();
});

async function submitTransfer() {
	if (!form.value.item || !form.value.quantity || !form.value.fromLocation || !form.value.toLocation) {
		showToast({ message: "Please complete all required transfer details.", variant: "danger" });
		return;
	}

	submitting.value = true;

	try {
		await frappe.call({
			method: "vision_empower.vision_empower.api.submit_location_transfer",
			args: {
				item: form.value.item,
				quantity: form.value.quantity,
				from_location: form.value.fromLocation,
				to_location: form.value.toLocation,
				reason: form.value.reason,
			},
		});

		showToast({ message: "Transfer submitted.", variant: "success" });
		form.value.quantity = "";
		form.value.fromLocation = "";
		form.value.toLocation = "";
		form.value.reason = "";
		await loadTransfers();
	} catch (error) {
		console.error("Failed to submit transfer:", error);
		showToast({ message: "Failed to submit the transfer.", variant: "danger" });
	} finally {
		submitting.value = false;
	}
}

function openTransfer(transfer) {
	router.push({ name: "location-transfer-detail", params: { transferId: transfer.name } });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Location Transfer</h2>
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">New Transfer Request</h2>
			</template>

			<p v-if="!canSubmit" class="ve-subtitle">
				Your role doesn't submit location transfers — this section is view-only for you.
			</p>

			<form v-else class="ve-form-grid" @submit.prevent="submitTransfer">
				<div class="ve-field">
					<label class="ve-field-label">Item</label>
					<select v-model="form.item" class="ve-field-input" :disabled="loadingOptions">
						<option v-for="i in items" :key="i.name" :value="i.name">
							{{ i.name }} — {{ i.item_name }}
						</option>
					</select>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Quantity</label>
					<input v-model="form.quantity" class="ve-field-input" type="number" min="0" required />
				</div>

				<div class="ve-field">
					<label class="ve-field-label">From Location</label>
					<select v-model="form.fromLocation" class="ve-field-input" :disabled="loadingOptions" required>
						<option value="" disabled>Select warehouse</option>
						<option v-for="wh in warehouses" :key="wh.name" :value="wh.name">{{ wh.warehouse_name }}</option>
					</select>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">To Location</label>
					<select v-model="form.toLocation" class="ve-field-input" :disabled="loadingOptions" required>
						<option value="" disabled>Select warehouse</option>
						<option v-for="wh in warehouses" :key="wh.name" :value="wh.name">{{ wh.warehouse_name }}</option>
					</select>
				</div>

				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Reason</label>
					<input v-model="form.reason" class="ve-field-input" type="text" placeholder="e.g. Stock rebalancing for Bihar dispatch" />
				</div>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button type="submit" class="ve-button ve-button--primary" :disabled="submitting">
						{{ submitting ? "Submitting..." : "Submit Transfer" }}
					</button>
				</div>
			</form>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Recent Transfers</h2>
			</template>

			<div v-if="loadingTransfers" class="ve-pagination-note">Loading transfers...</div>

			<div v-else class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Transfer ID</th>
							<th>Item</th>
							<th>From</th>
							<th>To</th>
							<th>Qty</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="t in transfers" :key="t.name" @click="openTransfer(t)">
							<td><span class="ve-link">{{ t.name }}</span></td>
							<td>{{ t.item }}</td>
							<td>{{ t.from_location }}</td>
							<td>{{ t.to_location }}</td>
							<td>{{ t.quantity }}</td>
							<td>
								<span
									class="ve-status-text"
									:class="`ve-status-text--${t.status === 'Completed' ? 'active' : 'inactive'}`"
								>
									{{ t.status }}
								</span>
							</td>
						</tr>
						<tr v-if="transfers.length === 0">
							<td colspan="6" style="text-align: center">No transfers found.</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
