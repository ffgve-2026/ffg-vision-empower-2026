<script setup>
import { ref } from "vue";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ITEMS } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

// Client-side only — Inventory ownership isn't explicit in the original
// role breakdown; Admin is the closest fit (see the API contract's
// "assumptions to confirm"). The backend should enforce whichever role
// gets confirmed once a real endpoint exists.
const canSubmit = userHasAnyRole([ROLES.ADMIN]);

const LOCATIONS = ["Mumbai Warehouse", "Delhi Hub", "Bengaluru Store", "Central Hub — Patna"];

const form = ref({
	item: ITEMS[0].id,
	quantity: "",
	fromLocation: "",
	toLocation: "",
	reason: "",
});

const submitting = ref(false);

const transfers = ref([
	{ id: "TRF-2026-012", item: "Braille Slate Set", from: "Mumbai Warehouse", to: "Delhi Hub", qty: 25, date: "25 Aug 2026", status: "Completed" },
	{ id: "TRF-2026-011", item: "Math Geometry Board", from: "Delhi Hub", to: "Bengaluru Store", qty: 10, date: "20 Aug 2026", status: "In Transit" },
]);

function submitTransfer() {
	if (!form.value.quantity || !form.value.fromLocation || !form.value.toLocation) {
		showToast({ message: "Please complete all required transfer details.", variant: "danger" });
		return;
	}

	submitting.value = true;
	showToast({ message: "Transfer submission isn't wired up yet.", variant: "warning" });
	submitting.value = false;
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
					<select v-model="form.item" class="ve-field-input">
						<option v-for="item in ITEMS" :key="item.id" :value="item.id">
							{{ item.id }} — {{ item.name }}
						</option>
					</select>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Quantity</label>
					<input v-model="form.quantity" class="ve-field-input" type="number" min="0" required />
				</div>

				<div class="ve-field">
					<label class="ve-field-label">From Location</label>
					<select v-model="form.fromLocation" class="ve-field-input" required>
						<option value="" disabled>Select location</option>
						<option v-for="loc in LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
					</select>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">To Location</label>
					<select v-model="form.toLocation" class="ve-field-input" required>
						<option value="" disabled>Select location</option>
						<option v-for="loc in LOCATIONS" :key="loc" :value="loc">{{ loc }}</option>
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

			<div class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Transfer ID</th>
							<th>Item</th>
							<th>From</th>
							<th>To</th>
							<th>Qty</th>
							<th>Date</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="t in transfers" :key="t.id">
							<td><span class="ve-link">{{ t.id }}</span></td>
							<td>{{ t.item }}</td>
							<td>{{ t.from }}</td>
							<td>{{ t.to }}</td>
							<td>{{ t.qty }}</td>
							<td>{{ t.date }}</td>
							<td>
								<span
									class="ve-status-text"
									:class="`ve-status-text--${t.status === 'Completed' ? 'active' : 'inactive'}`"
								>
									{{ t.status }}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
