<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";
import { callApi } from "../utils/api";

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
	completed: "Completed",
	rejected: "Rejected",
};

// Every PR, visible to all 4 roles regardless of whose turn it is to act.
const requests = ref([]);
const loading = ref(true);

async function load() {
	try {
		requests.value = await callApi("list_purchase_requisitions");
	} finally {
		loading.value = false;
	}
}

onMounted(load);

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return requests.value;
	return requests.value.filter(
		(r) => r.pr.toLowerCase().includes(term) || r.item.toLowerCase().includes(term)
	);
});

function openRequest(pr) {
	router.push({ name: "procurement-status", params: { prId: pr.pr } });
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
							<td>{{ r.requested_by }}</td>
							<td>{{ r.date }}</td>
							<td><span class="ve-pill">{{ STAGE_LABELS[r.stage] }}</span></td>
						</tr>
						<tr v-if="!loading && !filtered.length">
							<td colspan="5" class="ve-table-secondary">No procurement requests yet.</td>
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
