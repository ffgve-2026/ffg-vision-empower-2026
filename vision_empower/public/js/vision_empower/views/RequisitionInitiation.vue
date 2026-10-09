<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { callApi, getList } from "../utils/api";

const router = useRouter();
const submitting = ref(false);
const loadingOptions = ref(false);

// Client-side only — hides the form for roles that can't raise a request.
// The backend independently enforces the same role on the actual
// submit_purchase_requisition call, which is the real security boundary.
const canSubmit = userHasAnyRole(PR_STEP_ROLES.requisition);

const NONE_VALUE = "";

const kits = ref([]);
const items = ref([]);
const schools = ref([]);
const funds = ref([]);

async function loadOptions() {
	loadingOptions.value = true;

	try {
		const [kitRows, itemRows, schoolRows, fundRows] = await Promise.all([
			getList("Kit", ["name", "kit_name"], { active: 1 }, "kit_name asc"),
			getList("Item", ["name", "item_name"], { active: 1 }, "item_name asc"),
			getList("School", ["name", "school_name", "state"], { active: 1 }, "school_name asc"),
			getList("Fund", ["name", "fund_name"], { status: "Active" }, "fund_name asc"),
		]);

		kits.value = kitRows;
		items.value = itemRows;
		schools.value = schoolRows;
		funds.value = fundRows;
	} catch (error) {
		console.error("Failed to load requisition options:", error);
		showToast({ message: "Could not load Kit/Item/School options.", variant: "danger" });
	} finally {
		loadingOptions.value = false;
	}
}

onMounted(loadOptions);

const form = ref({
	kit: NONE_VALUE,
	item: NONE_VALUE,
	quantity: "",
	targetSchools: [],
	expectedDelivery: "",
	fund: NONE_VALUE,
	remarks: "",
});

// A request is for a Kit or an Item, never both — picking one clears the
// other rather than letting them silently disagree.
function onKitChange() {
	if (form.value.kit !== NONE_VALUE) form.value.item = NONE_VALUE;
}

function onItemChange() {
	if (form.value.item !== NONE_VALUE) form.value.kit = NONE_VALUE;
}

async function submit() {
	if (form.value.kit === NONE_VALUE && form.value.item === NONE_VALUE) {
		showToast({ message: "Select a Kit or an Item for this requisition.", variant: "danger" });
		return;
	}
	if (!form.value.targetSchools.length) {
		showToast({ message: "Select at least one target school.", variant: "danger" });
		return;
	}

	submitting.value = true;

	try {
		const pr = await callApi("submit_purchase_requisition", {
			kit_type: form.value.kit,
			item_type: form.value.item,
			quantity: form.value.quantity,
			target_schools: JSON.stringify(form.value.targetSchools),
			expected_delivery: form.value.expectedDelivery,
			fund: form.value.fund,
			remarks: form.value.remarks,
		});

		showToast({ message: pr.message, variant: "success" });
		router.push({ name: "procurement-status", params: { prId: pr.pr_id } });
	} catch (error) {
		showToast({ message: "Could not submit the requisition.", variant: "danger" });
		throw error;
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Purchase Requisition — Initiation</h2>
		</div>
		<ProcurementPipeline currentStage="requisition" />
		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Requisition Details</h2>
			</template>

			<form v-if="canSubmit" class="ve-form-grid" @submit.prevent="submit">
				<div class="ve-field">
					<label class="ve-field-label">Kit</label>
					<select v-model="form.kit" class="ve-field-input" :disabled="loadingOptions" @change="onKitChange">
						<option :value="NONE_VALUE">None</option>
						<option v-for="kit in kits" :key="kit.name" :value="kit.name">{{ kit.kit_name }}</option>
					</select>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Item</label>
					<select v-model="form.item" class="ve-field-input" :disabled="loadingOptions" @change="onItemChange">
						<option :value="NONE_VALUE">None</option>
						<option v-for="item in items" :key="item.name" :value="item.name">{{ item.item_name }}</option>
					</select>
				</div>

				<p class="ve-field-hint" style="grid-column: 1 / -1">
					Choose either a Kit or an individual Item, not both — selecting one resets the other to "None".
				</p>

				<div class="ve-field">
					<label class="ve-field-label">Quantity {{ form.kit ? "(Kits)" : "(Units)" }}</label>
					<input v-model="form.quantity" class="ve-field-input" type="number" min="1" placeholder="e.g. 150" required />
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Expected Delivery</label>
					<input v-model="form.expectedDelivery" class="ve-field-input" type="date" required />
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Fund <span class="ve-field-optional">(optional)</span></label>
					<select v-model="form.fund" class="ve-field-input" :disabled="loadingOptions">
						<option :value="NONE_VALUE">None</option>
						<option v-for="fund in funds" :key="fund.name" :value="fund.name">{{ fund.fund_name || fund.name }}</option>
					</select>
				</div>

				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Target Schools</label>
					<div class="ve-checkbox-group">
						<label v-for="school in schools" :key="school.name" class="ve-checkbox-item">
							<input v-model="form.targetSchools" type="checkbox" :value="school.name" />
							{{ school.school_name }}<span v-if="school.state" class="ve-table-secondary">&nbsp;({{ school.state }})</span>
						</label>
					</div>
					<p v-if="!loadingOptions && !schools.length" class="ve-field-hint">No active schools in Master Data yet.</p>
					<p v-else class="ve-field-hint">The quantity is split evenly across the selected schools at dispatch.</p>
				</div>

				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Remarks <span class="ve-field-optional">(optional)</span></label>
					<textarea v-model="form.remarks" class="ve-field-input ve-field-textarea" rows="2" />
				</div>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button type="submit" class="ve-button ve-button--primary" :disabled="submitting">
						{{ submitting ? "Submitting..." : "Submit for Approval" }}
					</button>
				</div>
			</form>

			<p v-else class="ve-subtitle">
				Your role doesn't raise requisitions — this step is view-only for you.
			</p>
		</BaseWidget>
	</div>
</template>
