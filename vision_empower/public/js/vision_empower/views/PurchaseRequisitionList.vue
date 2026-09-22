<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();
const search = ref("");
const canRaiseNew = userHasAnyRole(PR_STEP_ROLES.requisition);

const STAGE_LABELS = {
	requisition: "Requisition",
	approval: "Approval",
	quotations: "Quotation Collection",
	"vendor-selection": "Vendor Selection",
	"payment-approval": "Payment Approval",
	payment: "Payment Processing",
	dispatch: "Dispatch",
	delivery: "Delivery Confirmation",
};

// Same set as the Dashboard's "Procurement Requests" widget — every open
// request, visible to all 4 roles regardless of whose turn it is to act.
const requests = ref([
	{ pr: "PR-2026-0041", item: "Braille Slate & Stylus Set", stage: "requisition", requestedBy: "R. Sen", date: "02 Sep" },
	{ pr: "PR-2026-0044", item: "Solar Lantern 5W with Charger", stage: "approval", requestedBy: "A. Patel", date: "05 Sep" },
	{ pr: "PR-2026-0038", item: "STEM Robotics Kit Grade 6", stage: "quotations", requestedBy: "K. Reddy", date: "06 Sep" },
	{ pr: "PR-2026-0042", item: "First-Aid Kit Grade A", stage: "vendor-selection", requestedBy: "S. Khan", date: "07 Sep" },
	{ pr: "PR-2026-0035", item: "Primary Math Textbooks", stage: "payment-approval", requestedBy: "R. Sen", date: "08 Sep" },
	{ pr: "PR-2026-0039", item: "Visual Classroom Projector Pro", stage: "payment", requestedBy: "A. Patel", date: "09 Sep" },
	{ pr: "PR-2026-0047", item: "CT Learning Kit — Primary", stage: "dispatch", requestedBy: "K. Reddy", date: "10 Sep" },
	{ pr: "PR-2026-0050", item: "Geometry Board Set", stage: "delivery", requestedBy: "S. Khan", date: "11 Sep" },
]);

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return requests.value;
	return requests.value.filter(
		(r) => r.pr.toLowerCase().includes(term) || r.item.toLowerCase().includes(term)
	);
});

function openRequest(pr) {
	router.push({
		name: "procurement-status",
		params: { prId: pr.pr },
		query: { item: pr.item, requestedBy: pr.requestedBy, date: pr.date, stage: pr.stage },
	});
}

function newRequisition() {
	router.push({ name: "procurement-new-requisition" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Procurement Requests</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<input v-model="search" class="ve-toolbar-search" type="text" placeholder="Search by PR ID or item..." />
				<div class="ve-toolbar-spacer" />
				<button v-if="canRaiseNew" class="ve-button ve-button--primary" @click="newRequisition">
					New Requisition
				</button>
			</div>

			<div class="ve-table-wrapper" style="margin-top: 1rem">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>PR ID</th>
							<th>Item</th>
							<th>Requested By</th>
							<th>Date</th>
							<th>Stage</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="r in filtered" :key="r.pr" @click="openRequest(r)">
							<td><span class="ve-link">{{ r.pr }}</span></td>
							<td>{{ r.item }}</td>
							<td>{{ r.requestedBy }}</td>
							<td>{{ r.date }}</td>
							<td><span class="ve-pill">{{ STAGE_LABELS[r.stage] }}</span></td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-pagination-note">
				Showing {{ filtered.length }} of {{ requests.length }} requests
			</div>
		</BaseWidget>
	</div>
</template>
