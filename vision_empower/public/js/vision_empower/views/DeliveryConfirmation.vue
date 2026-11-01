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

const prId = route.params.prId;

const pr = ref(null);
const isOpen = computed(() => pr.value?.stage === "delivery");

// Each school's challan is confirmed on its own; the PR closes after the last.
const pending = computed(() =>
	(pr.value?.dispatches || []).filter((dc) => dc.status === "Dispatched")
);
const challan = ref("");
const received = ref({});
const selected = computed(() => pending.value.find((dc) => dc.name === challan.value));
const isLast = computed(() => pending.value.length === 1);

function pickChallan(name) {
	challan.value = name;
	const dc = pending.value.find((d) => d.name === name);
	received.value = Object.fromEntries((dc?.items || []).map((row) => [row.item, row.qty]));
}

async function load() {
	pr.value = await callApi("get_purchase_requisition_status", { pr_id: prId });
	pickChallan(pending.value[0]?.name || "");
}

onMounted(load);

// Anything received short of what was sent is recorded as a shortage.
const shortItems = computed(() =>
	(selected.value?.items || []).filter((row) => Number(received.value[row.item]) < row.qty)
);

// Client-side only — the backend's confirm_delivery re-checks the role.
const canAct = userHasAnyRole(PR_STEP_ROLES.deliveryConfirmation);

const CONDITIONS = ["Good", "Damaged", "Shortage"];

const form = ref({
	condition: "Good",
	receivedDate: new Date().toISOString().split("T")[0],
	receivedBy: "",
	remarks: "",
	signedDeliveryChallan: null,
});

const submitting = ref(false);
const isDragging = ref(false);

function handleFile(file) {
	if (!file) return;

	const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

	if (!allowedTypes.includes(file.type)) {
		showToast({
			message: "Please upload a PDF, JPG or PNG delivery challan.",
			variant: "danger",
		});
		return;
	}

	form.value.signedDeliveryChallan = file;
}

function handleFileInput(event) {
	handleFile(event.target.files?.[0]);
}

function handleDrop(event) {
	isDragging.value = false;
	handleFile(event.dataTransfer.files?.[0]);
}

function removeFile() {
	form.value.signedDeliveryChallan = null;
}

async function confirmReceipt() {
	if (!form.value.receivedDate || !form.value.receivedBy || !form.value.signedDeliveryChallan) {
		showToast({
			message: "Please complete the receipt details and upload the signed delivery challan.",
			variant: "danger",
		});
		return;
	}

	submitting.value = true;

	try {
		const file = await uploadFile(form.value.signedDeliveryChallan);
		const result = await callApi("confirm_delivery", {
			pr_id: prId,
			challan: challan.value,
			received_items: JSON.stringify(received.value),
			received_date: form.value.receivedDate,
			received_by: form.value.receivedBy,
			condition: form.value.condition,
			remarks: form.value.remarks,
			file_url: file.file_url,
		});

		showToast({ message: result.message, variant: "success" });
		if (result.remaining) {
			form.value = {
				...form.value,
				condition: "Good",
				receivedBy: "",
				remarks: "",
				signedDeliveryChallan: null,
			};
			await load();
		} else {
			router.push({ name: "procurement-status", params: { prId } });
		}
	} catch (error) {
		showToast({
			message: "Could not confirm delivery.",
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
			<h2>Delivery Confirmation</h2>
			<p class="ve-subtitle">
				Record receipt of the delivery for procurement request {{ prId }}
			</p>
		</div>
		<ProcurementPipeline currentStage="delivery" />

		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Receipt Details</h2>
					<p class="ve-subtitle">
						Confirm that the order has been received by the school
					</p>
				</div>
			</template>

			<p v-if="!canAct" class="ve-subtitle">
				Your role doesn't confirm deliveries — this step is view-only for you.
			</p>

			<p v-else-if="pr && !isOpen" class="ve-subtitle">
				Delivery confirmation isn't pending — this request is at "{{ pr.stage_label }}".
			</p>

			<form v-else-if="pr" class="ve-form-grid" @submit.prevent="confirmReceipt">
				<!-- Which school's challan -->
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Delivery Challan</label>
					<select
						:value="challan"
						class="ve-field-input"
						required
						@change="pickChallan($event.target.value)"
					>
						<option v-for="dc in pending" :key="dc.name" :value="dc.name">
							{{ dc.name }} — {{ dc.school_name || "No school" }} ({{ dc.kit_qty }}
							kit(s))
						</option>
					</select>
					<span class="ve-field-hint">
						{{ pending.length }} school(s) still to confirm. Each school confirms its
						own challan.
					</span>
				</div>

				<!-- What arrived in good condition -->
				<div v-if="selected" class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Received in Good Condition</label>
					<table class="ve-data-table ve-received-items">
						<thead>
							<tr>
								<th>Item</th>
								<th>Sent</th>
								<th>Received</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="row in selected.items" :key="row.item">
								<td>{{ row.item_name }}</td>
								<td>{{ row.qty }}</td>
								<td>
									<input
										v-model.number="received[row.item]"
										class="ve-field-input"
										type="number"
										min="0"
										:max="row.qty"
										:aria-label="`Received ${row.item_name}`"
									/>
								</td>
							</tr>
						</tbody>
					</table>
					<span v-if="shortItems.length" class="ve-field-hint ve-text-danger">
						{{ shortItems.length }} item(s) short — a delivery discrepancy will be
						opened for each.
					</span>
				</div>

				<!-- Received Date -->
				<div class="ve-field">
					<label class="ve-field-label"> Received Date </label>

					<input
						v-model="form.receivedDate"
						class="ve-field-input"
						type="date"
						required
					/>
				</div>

				<!-- Received By -->
				<div class="ve-field">
					<label class="ve-field-label"> Received By </label>

					<input
						v-model="form.receivedBy"
						class="ve-field-input"
						type="text"
						placeholder="e.g. School SPOC — Priya Sharma"
						required
					/>
				</div>

				<!-- Condition -->
				<div class="ve-field">
					<label class="ve-field-label">Condition</label>
					<select v-model="form.condition" class="ve-field-input">
						<option v-for="c in CONDITIONS" :key="c" :value="c">{{ c }}</option>
					</select>
				</div>

				<!-- Remarks -->
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">
						Remarks
						<span class="ve-field-optional">(Optional)</span>
					</label>

					<textarea
						v-model="form.remarks"
						class="ve-field-textarea"
						placeholder="Add any remarks about the delivery..."
					></textarea>
				</div>

				<!-- Signed Delivery Challan -->
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label"> Signed Delivery Challan </label>

					<div
						class="ve-delivery-dropzone"
						:class="{
							've-delivery-dropzone--active': isDragging,
						}"
						@dragover.prevent="isDragging = true"
						@dragleave.prevent="isDragging = false"
						@drop.prevent="handleDrop"
					>
						<div v-if="!form.signedDeliveryChallan" class="ve-delivery-upload-content">
							<div class="ve-delivery-upload-title">
								Drop signed delivery challan here
							</div>

							<div class="ve-delivery-upload-subtitle">or click to browse</div>

							<label class="ve-button ve-button--primary ve-delivery-browse">
								Choose File
								<input
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									@change="handleFileInput"
								/>
							</label>

							<div class="ve-delivery-upload-hint">PDF, JPG or PNG</div>
						</div>

						<div v-else class="ve-delivery-file">
							<div>
								<div class="ve-delivery-file-name">
									{{ form.signedDeliveryChallan.name }}
								</div>

								<div class="ve-table-secondary">
									{{
										(form.signedDeliveryChallan.size / 1024 / 1024).toFixed(2)
									}}
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

				<!-- Action -->
				<div
					class="ve-form-actions"
					style="grid-column: 1 / -1; justify-content: flex-end"
				>
					<button
						type="submit"
						class="ve-button ve-button--success"
						:disabled="submitting"
					>
						{{
							submitting
								? "Saving..."
								: isLast
								? "Confirm Receipt and Close PR"
								: "Confirm Receipt for this School"
						}}
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>
