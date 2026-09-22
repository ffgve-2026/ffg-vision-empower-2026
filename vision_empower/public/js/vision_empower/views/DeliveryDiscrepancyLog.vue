<script setup>
import { ref } from "vue";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ROLES, userHasAnyRole } from "../config/roles";

// Client-side only — discrepancy reporting isn't explicit in the original
// role breakdown; Field User is the closest fit, since they're already
// the one confirming delivery/condition at PR step 8 (see the API
// contract's "assumptions to confirm").
const canReport = userHasAnyRole([ROLES.FIELD_USER]);

const discrepancies = ref([
	{ dc: "DC-2024-482", school: "Govt. Primary, Patna", item: "Math Textbooks Class 1-5", expected: 320, received: 310, shortage: 10, action: "Vendor Notified" },
	{ dc: "DC-2024-510", school: "Model School, Ranchi", item: "Solar Lanterns (Heavy)", expected: 30, received: 28, shortage: 2, action: "Replacement Sent" },
	{ dc: "DC-2024-544", school: "DAV Public, Gaya", item: "First-Aid Kits Grade A", expected: 12, received: 12, shortage: 0, action: "Damage — 2 units" },
]);

function reportDiscrepancy() {
	showToast({ message: "Reporting a discrepancy isn't wired up yet.", variant: "warning" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Delivery Discrepancy Log</h2>
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Discrepancy Records</h2>
			</template>

			<div class="ve-table-wrapper">
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
						<tr v-for="d in discrepancies" :key="d.dc">
							<td><span class="ve-link">{{ d.dc }}</span></td>
							<td>{{ d.school }}</td>
							<td>{{ d.item }}</td>
							<td>{{ d.expected }}</td>
							<td>{{ d.received }}</td>
							<td>{{ d.shortage }}</td>
							<td>{{ d.action }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="canReport" class="ve-form-actions" style="margin-top: 1rem">
				<button class="ve-button ve-button--primary" @click="reportDiscrepancy">
					Report New Discrepancy
				</button>
			</div>
		</BaseWidget>
	</div>
</template>
