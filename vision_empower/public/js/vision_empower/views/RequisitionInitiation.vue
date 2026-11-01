<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { callApi, getList } from "../utils/api";

const route = useRoute();
const router = useRouter();
const submitting = ref(false);

// /procurement/:prId/requisition — revising a request the approver sent
// back for rework; otherwise a new request.
const reworkId = route.params.prId || "";
const rework = ref(null);
const reworkOpen = computed(() => rework.value?.stage === "requisition");
const loadingOptions = ref(false);

// Client-side only — hides the form for roles that can't raise a request.
// The backend independently enforces the same role on the actual
// submit_purchase_requisition call, which is the real security boundary.
const canSubmit = userHasAnyRole(PR_STEP_ROLES.requisition);

const NONE_VALUE = "";

const kits = ref([]);
const schools = ref([]);
const funds = ref([]);
const projects = ref([]);

async function loadOptions() {
	loadingOptions.value = true;

	try {
		const [kitRows, schoolRows, fundRows, projectRows] = await Promise.all([
			getList("Kit", ["name", "kit_name"], { active: 1 }, "kit_name asc"),
			getList("School", ["name", "school_name", "state"], { active: 1 }, "school_name asc"),
			getList("Fund", ["name", "fund_name"], { status: "Active" }, "fund_name asc"),
			getList(
				"VE Project",
				["name", "project_name", "fund"],
				{ active: 1 },
				"project_name asc"
			),
		]);

		kits.value = kitRows;
		schools.value = schoolRows;
		funds.value = fundRows;
		projects.value = projectRows;

		if (reworkId) {
			rework.value = await callApi("get_purchase_requisition_status", { pr_id: reworkId });
			const r = rework.value.record;
			form.value = {
				kit: r.kit || NONE_VALUE,
				quantity: String(r.request_qty || ""),
				targetSchools: r.target_schools.map((s) => s.school),
				expectedDelivery: r.required_by_date || "",
				fund: r.fund || NONE_VALUE,
				project: r.project || NONE_VALUE,
				remarks: r.remarks || "",
			};
		}
	} catch (error) {
		console.error("Failed to load requisition options:", error);
		showToast({ message: "Could not load Kit/School options.", variant: "danger" });
	} finally {
		loadingOptions.value = false;
	}
}

onMounted(loadOptions);

const form = ref({
	kit: NONE_VALUE,
	quantity: "",
	targetSchools: [],
	expectedDelivery: "",
	fund: NONE_VALUE,
	project: NONE_VALUE,
	remarks: "",
});

// Picking a project pre-selects its default fund (still changeable).
function onProjectChange() {
	const project = projects.value.find((p) => p.name === form.value.project);
	if (project?.fund && funds.value.some((f) => f.name === project.fund))
		form.value.fund = project.fund;
}

// Why the approver sent it back — the latest "sent back" entry.
const reworkReason = computed(
	() =>
		[...(rework.value?.activity || [])].reverse().find((a) => a.action === "sent_back")
			?.remarks || ""
);

async function submit() {
	if (form.value.kit === NONE_VALUE) {
		showToast({ message: "Select a Kit for this requisition.", variant: "danger" });
		return;
	}
	if (!form.value.targetSchools.length) {
		showToast({ message: "Select at least one target school.", variant: "danger" });
		return;
	}
	if (form.value.project === NONE_VALUE || form.value.fund === NONE_VALUE) {
		showToast({ message: "Select the project and the fund.", variant: "danger" });
		return;
	}

	submitting.value = true;

	try {
		const args = {
			// Requisitions are Kit-only for now; the endpoint still accepts
			// item_type should single-Item requests come back.
			kit_type: form.value.kit,
			quantity: form.value.quantity,
			target_schools: JSON.stringify(form.value.targetSchools),
			expected_delivery: form.value.expectedDelivery,
			fund: form.value.fund,
			project: form.value.project,
			remarks: form.value.remarks,
		};
		const pr = reworkId
			? await callApi("resubmit_purchase_requisition", { pr_id: reworkId, ...args })
			: await callApi("submit_purchase_requisition", args);

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
			<h2>
				{{
					reworkId
						? `Purchase Requisition — Rework ${reworkId}`
						: "Purchase Requisition — Initiation"
				}}
			</h2>
		</div>
		<ProcurementPipeline currentStage="requisition" />
		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Requisition Details</h2>
			</template>

			<p v-if="reworkId && rework && !reworkOpen" class="ve-subtitle">
				{{ reworkId }} isn't waiting for rework — it's at "{{ rework.stage_label }}".
			</p>

			<form
				v-else-if="canSubmit && (!reworkId || rework)"
				class="ve-form-grid"
				@submit.prevent="submit"
			>
				<div
					v-if="reworkReason"
					class="ve-field ve-rework-note"
					style="grid-column: 1 / -1"
				>
					<strong>Sent back for rework:</strong> {{ reworkReason }}
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Kit</label>
					<select v-model="form.kit" class="ve-field-input" :disabled="loadingOptions">
						<option :value="NONE_VALUE" disabled>Select kit</option>
						<option v-for="kit in kits" :key="kit.name" :value="kit.name">
							{{ kit.kit_name }}
						</option>
					</select>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Quantity (Kits)</label>
					<input
						v-model="form.quantity"
						class="ve-field-input"
						type="number"
						min="1"
						placeholder="e.g. 150"
						required
					/>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Expected Delivery</label>
					<input
						v-model="form.expectedDelivery"
						class="ve-field-input"
						type="date"
						required
					/>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Project</label>
					<select
						v-model="form.project"
						class="ve-field-input"
						:disabled="loadingOptions"
						@change="onProjectChange"
					>
						<option :value="NONE_VALUE" disabled>Select project</option>
						<option v-for="p in projects" :key="p.name" :value="p.name">
							{{ p.project_name }}
						</option>
					</select>
					<p v-if="!loadingOptions && !projects.length" class="ve-field-hint">
						No active projects yet — an Admin adds them in Desk → VE Project.
					</p>
				</div>

				<div class="ve-field">
					<label class="ve-field-label">Fund</label>
					<select v-model="form.fund" class="ve-field-input" :disabled="loadingOptions">
						<option :value="NONE_VALUE" disabled>Select fund</option>
						<option v-for="fund in funds" :key="fund.name" :value="fund.name">
							{{ fund.fund_name || fund.name }}
						</option>
					</select>
				</div>

				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Target Schools</label>
					<div class="ve-checkbox-group">
						<label
							v-for="school in schools"
							:key="school.name"
							class="ve-checkbox-item"
						>
							<input
								v-model="form.targetSchools"
								type="checkbox"
								:value="school.name"
							/>
							{{ school.school_name
							}}<span v-if="school.state" class="ve-table-secondary"
								>&nbsp;({{ school.state }})</span
							>
						</label>
					</div>
					<p v-if="!loadingOptions && !schools.length" class="ve-field-hint">
						No active schools in Master Data yet.
					</p>
					<p v-else class="ve-field-hint">
						The quantity is split evenly across the selected schools by default; it can
						be adjusted per school at dispatch.
					</p>
				</div>

				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label"
						>Remarks <span class="ve-field-optional">(optional)</span></label
					>
					<textarea
						v-model="form.remarks"
						class="ve-field-input ve-field-textarea"
						rows="2"
					/>
				</div>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button
						type="submit"
						class="ve-button ve-button--primary"
						:disabled="submitting"
					>
						{{
							submitting
								? "Submitting..."
								: reworkId
								? "Resubmit for Approval"
								: "Submit for Approval"
						}}
					</button>
				</div>
			</form>

			<p v-else class="ve-subtitle">
				Your role doesn't raise requisitions — this step is view-only for you.
			</p>
		</BaseWidget>
	</div>
</template>
