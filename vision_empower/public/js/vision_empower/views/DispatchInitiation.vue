<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";
import { callApi, uploadFile } from "../utils/api";
const route = useRoute();
const router = useRouter();

// Client-side only — hides the dispatch form for roles that can't act on
// this step. The backend independently enforces the same role on the
// actual confirm_dispatch call, which is the real security boundary.
const canAct = userHasAnyRole(PR_STEP_ROLES.dispatch);

const prId = route.params.prId;

const pr = ref(null);
const isOpen = computed(() => pr.value?.stage === "dispatch");

// Kits per school — an even split to start, editable; must add up to the request.
const schoolKits = ref({});
const totalKits = computed(() => Number(pr.value?.record.request_qty) || 0);
const allocated = computed(() =>
	Object.values(schoolKits.value).reduce((sum, n) => sum + (Number(n) || 0), 0)
);

onMounted(async () => {
	pr.value = await callApi("get_purchase_requisition_status", { pr_id: prId });
	const schools = pr.value.record.target_schools;
	const base = Math.floor(totalKits.value / (schools.length || 1));
	const extra = totalKits.value % (schools.length || 1);
	schoolKits.value = Object.fromEntries(
		schools.map((s, i) => [s.school, base + (i < extra ? 1 : 0)])
	);
});

const today = new Date().toISOString().split("T")[0];

const form = ref({
	dispatchDate: today,
	transporter: "BlueDart",
	lrDocketNumber: "",
	transportCertificate: null,
});

const submitting = ref(false);
const isDragging = ref(false);

function handleFile(file) {
	if (!file) return;

	const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

	if (!allowedTypes.includes(file.type)) {
		showToast({
			message: "Please upload a PDF, JPG or PNG transport certificate.",
			variant: "danger",
		});
		return;
	}

	form.value.transportCertificate = file;
}

function handleFileInput(event) {
	handleFile(event.target.files?.[0]);
}

function handleDrop(event) {
	isDragging.value = false;
	handleFile(event.dataTransfer.files?.[0]);
}

function removeFile() {
	form.value.transportCertificate = null;
}

async function initiateDispatch() {
	if (!form.value.dispatchDate || !form.value.transporter || !form.value.lrDocketNumber) {
		showToast({
			message: "Please complete all required dispatch details.",
			variant: "danger",
		});
		return;
	}
	if (pr.value.record.target_schools.length && allocated.value !== totalKits.value) {
		showToast({
			message: `The schools' quantities add up to ${allocated.value}, but the request is for ${totalKits.value}.`,
			variant: "danger",
		});
		return;
	}

	submitting.value = true;

	try {
		const file = form.value.transportCertificate
			? await uploadFile(form.value.transportCertificate)
			: null;
		const result = await callApi("confirm_dispatch", {
			pr_id: prId,
			dispatch_date: form.value.dispatchDate,
			transporter: form.value.transporter,
			lr_docket_no: form.value.lrDocketNumber,
			file_url: file?.file_url || "",
			school_kits: JSON.stringify(schoolKits.value),
		});

		showToast({ message: result.message, variant: "success" });
		router.push({ name: "procurement-status", params: { prId } });
	} catch (error) {
		showToast({
			message: "Could not initiate dispatch.",
			variant: "danger",
		});
		throw error;
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Initiate Dispatch</h2>
			<p class="ve-subtitle">Record dispatch details for procurement request {{ prId }}</p>
		</div>
		<ProcurementPipeline currentStage="dispatch" />

		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Dispatch Details</h2>
					<p class="ve-subtitle">Enter the details of the shipment being dispatched</p>
				</div>
			</template>

			<p v-if="!canAct" class="ve-subtitle">
				Your role doesn't confirm dispatches — this step is view-only for you.
			</p>

			<p v-else-if="pr && !isOpen" class="ve-subtitle">
				Dispatch isn't pending — this request is at "{{ pr.stage_label }}".
			</p>

			<p v-else-if="pr" class="ve-subtitle">
				One delivery challan will be raised per target school. Set how many
				{{ pr.record.kit ? "kits" : "units" }} each school gets; each challan's item
				quantities follow from that.
			</p>

			<form v-if="canAct && isOpen" class="ve-form-grid" @submit.prevent="initiateDispatch">
				<div
					v-if="pr.record.target_schools.length"
					class="ve-field"
					style="grid-column: 1 / -1"
				>
					<label class="ve-field-label">Quantity per School</label>
					<table class="ve-data-table ve-school-kits">
						<thead>
							<tr>
								<th>School</th>
								<th>{{ pr.record.kit ? "Kits" : "Units" }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="s in pr.record.target_schools" :key="s.school">
								<td>{{ s.school_name || s.school }}</td>
								<td>
									<input
										v-model.number="schoolKits[s.school]"
										class="ve-field-input"
										type="number"
										min="0"
										step="1"
										:aria-label="`Quantity for ${s.school_name || s.school}`"
									/>
								</td>
							</tr>
						</tbody>
						<tfoot>
							<tr>
								<th>Total</th>
								<th :class="{ 've-text-danger': allocated !== totalKits }">
									{{ allocated }} of {{ totalKits }}
								</th>
							</tr>
						</tfoot>
					</table>
				</div>

				<!-- Dispatch Date -->
				<div class="ve-field">
					<label class="ve-field-label"> Dispatch Date </label>

					<input
						v-model="form.dispatchDate"
						class="ve-field-input"
						type="date"
						required
					/>
				</div>

				<!-- Transporter -->
				<div class="ve-field">
					<label class="ve-field-label"> Transporter </label>

					<input
						v-model="form.transporter"
						class="ve-field-input"
						type="text"
						placeholder="Enter transporter name"
						required
					/>

					<span class="ve-field-hint">
						Will be populated from approved dispatch vendors.
					</span>
				</div>

				<!-- LR / Docket Number -->
				<div class="ve-field">
					<label class="ve-field-label"> LR / Docket Number </label>

					<input
						v-model="form.lrDocketNumber"
						class="ve-field-input"
						type="text"
						placeholder="Enter LR / Docket number"
						required
					/>
				</div>

				<!-- Transport Certificate -->
				<div class="ve-field">
					<label class="ve-field-label">
						Transport Certificate (TI)
						<span class="ve-field-optional">(Optional)</span>
					</label>

					<div
						class="ve-dispatch-dropzone"
						:class="{
							've-dispatch-dropzone--active': isDragging,
						}"
						@dragover.prevent="isDragging = true"
						@dragleave.prevent="isDragging = false"
						@drop.prevent="handleDrop"
					>
						<div v-if="!form.transportCertificate" class="ve-dispatch-upload-content">
							<div class="ve-dispatch-upload-title">Drop TI here</div>

							<div class="ve-dispatch-upload-subtitle">or click to browse</div>

							<label class="ve-button ve-button--primary ve-dispatch-browse">
								Choose File
								<input
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									@change="handleFileInput"
								/>
							</label>

							<div class="ve-dispatch-upload-hint">PDF, JPG or PNG · Optional</div>
						</div>

						<div v-else class="ve-dispatch-file">
							<div>
								<div class="ve-dispatch-file-name">
									{{ form.transportCertificate.name }}
								</div>

								<div class="ve-table-secondary">
									{{ (form.transportCertificate.size / 1024 / 1024).toFixed(2) }}
									MB
								</div>
							</div>

							<button
								type="button"
								class="ve-link-button ve-link-button--danger"
								@click="removeFile"
							>
								Remove
							</button>
						</div>
					</div>
				</div>

				<div
					class="ve-form-actions"
					style="grid-column: 1 / -1; justify-content: flex-end"
				>
					<button
						type="submit"
						class="ve-button ve-button--primary"
						:disabled="submitting"
					>
						{{ submitting ? "Initiating..." : "Initiate Dispatch" }}
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>
