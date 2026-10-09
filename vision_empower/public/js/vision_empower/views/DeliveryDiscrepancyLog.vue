<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();

// Client-side only — discrepancy reporting isn't explicit in the original
// role breakdown; Field User is the closest fit, since they're already
// the one confirming delivery/condition at PR step 8. The backend
// independently enforces the same role in report_delivery_discrepancy.
const canReport = userHasAnyRole([ROLES.FIELD_USER]);

const discrepancies = ref([]);
const challans = ref([]);
const loading = ref(false);
const loadingOptions = ref(false);
const reporting = ref(false);
const showForm = ref(false);

const emptyForm = () => ({ dc_number: "", item: "", received_qty: "", action_taken: "" });
const form = ref(emptyForm());

// School and expected qty come from the chosen challan, not user input.
const selectedChallan = computed(() =>
	challans.value.find((dc) => dc.name === form.value.dc_number)
);
const challanItems = computed(() => selectedChallan.value?.items || []);
const expectedQty = computed(
	() => challanItems.value.find((i) => i.item === form.value.item)?.qty ?? ""
);

function onChallanChange() {
	form.value.item = challanItems.value.length === 1 ? challanItems.value[0].item : "";
}

async function loadDiscrepancies() {
	loading.value = true;

	try {
		const response = await frappe.call({
			method: "vision_empower.api.delivery_discrepancy.list_delivery_discrepancies",
		});
		discrepancies.value = response.message || [];
	} catch (error) {
		console.error("Failed to load discrepancies:", error);
		showToast({ message: "Could not load discrepancy records.", variant: "danger" });
	} finally {
		loading.value = false;
	}
}

async function loadOptions() {
	loadingOptions.value = true;

	try {
		const response = await frappe.call({
			method: "vision_empower.api.delivery_discrepancy.list_challans_for_discrepancy",
		});
		challans.value = response.message || [];
	} catch (error) {
		console.error("Failed to load delivery challans:", error);
	} finally {
		loadingOptions.value = false;
	}
}

onMounted(() => {
	loadDiscrepancies();
	if (canReport) loadOptions();
});

function openReportForm() {
	showForm.value = true;
}

function cancelReportForm() {
	showForm.value = false;
}

async function reportDiscrepancy() {
	reporting.value = true;

	try {
		await frappe.call({
			method: "vision_empower.api.delivery_discrepancy.report_delivery_discrepancy",
			args: {
				dc_number: form.value.dc_number,
				item: form.value.item,
				received_qty: form.value.received_qty,
				action_taken: form.value.action_taken,
			},
		});

		showToast({ message: "Discrepancy reported.", variant: "success" });
		showForm.value = false;
		form.value = emptyForm();
		await loadDiscrepancies();
	} catch (error) {
		console.error("Failed to report discrepancy:", error);
		showToast({
			message: error.message || "Failed to report the discrepancy.",
			variant: "danger",
		});
	} finally {
		reporting.value = false;
	}
}

function openDiscrepancy(d) {
	router.push({ name: "delivery-discrepancy-detail", params: { discrepancyId: d.name } });
}

// The DC number opens the PR the challan was dispatched under.
function openChallan(d) {
	if (d.procurement_requisition)
		router.push({ name: "procurement-status", params: { prId: d.procurement_requisition } });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Delivery Discrepancy Log</h2>
		</div>

		<BaseWidget v-if="canReport && showForm">
			<template #header>
				<h2 class="ve-widget-title">Report New Discrepancy</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="reportDiscrepancy">
				<div class="ve-field">
					<label class="ve-field-label">Delivery Challan</label>
					<select
						v-model="form.dc_number"
						class="ve-field-input"
						:disabled="loadingOptions"
						required
						@change="onChallanChange"
					>
						<option value="" disabled>Select challan</option>
						<option v-for="dc in challans" :key="dc.name" :value="dc.name">
							{{ dc.name }} — {{ dc.school_name || "no school" }}
						</option>
					</select>
					<p v-if="!loadingOptions && !challans.length" class="ve-field-hint">
						No delivery challans dispatched yet.
					</p>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">School</label>
					<input
						class="ve-field-input"
						type="text"
						:value="selectedChallan?.school_name || ''"
						disabled
					/>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Item</label>
					<select
						v-model="form.item"
						class="ve-field-input"
						:disabled="!selectedChallan"
						required
					>
						<option value="" disabled>Select item</option>
						<option v-for="i in challanItems" :key="i.item" :value="i.item">
							{{ i.item_name }}
						</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Expected Quantity</label>
					<input class="ve-field-input" type="number" :value="expectedQty" disabled />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Received Quantity</label>
					<input
						v-model="form.received_qty"
						class="ve-field-input"
						type="number"
						min="0"
						:max="expectedQty"
						required
					/>
				</div>
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Action Taken</label>
					<input
						v-model="form.action_taken"
						class="ve-field-input"
						type="text"
						placeholder="e.g. Vendor Notified"
					/>
				</div>
				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button
						type="submit"
						class="ve-button ve-button--primary"
						:disabled="reporting"
					>
						{{ reporting ? "Reporting..." : "Submit" }}
					</button>
					<button type="button" class="ve-outline-button" @click="cancelReportForm">
						Cancel
					</button>
				</div>
			</form>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Discrepancy Records</h2>
			</template>

			<div v-if="loading" class="ve-pagination-note">Loading discrepancies...</div>

			<div v-else class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>DC Number</th>
							<th>School</th>
							<th>Item</th>
							<th>Expected</th>
							<th>Received</th>
							<th>Shortage</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="d in discrepancies" :key="d.name" @click="openDiscrepancy(d)">
							<td @click.stop="openChallan(d)">
								<span class="ve-link">{{ d.dc_number }}</span>
							</td>
							<td>{{ d.school_name || d.school }}</td>
							<td>{{ d.item_name || d.item }}</td>
							<td>{{ d.expected_qty }}</td>
							<td>{{ d.received_qty }}</td>
							<td>{{ d.shortage }}</td>
							<td>{{ d.action_taken || "-" }}</td>
						</tr>
						<tr v-if="discrepancies.length === 0">
							<td colspan="7" style="text-align: center">No discrepancies found.</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="canReport && !showForm" class="ve-form-actions" style="margin-top: 1rem">
				<button class="ve-button ve-button--primary" @click="openReportForm">
					Report New Discrepancy
				</button>
			</div>
		</BaseWidget>
	</div>
</template>
