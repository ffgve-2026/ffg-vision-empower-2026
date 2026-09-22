<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";

const route = useRoute();
const router = useRouter();

const prId = route.params.prId || "PR-00024";

const form = ref({
	receivedDate: new Date().toISOString().split("T")[0],
	receivedBy: "",
	remarks: "",
	signedDeliveryChallan: null,
});

const submitting = ref(false);
const isDragging = ref(false);

function handleFile(file) {
	if (!file) return;

	const allowedTypes = [
		"application/pdf",
		"image/jpeg",
		"image/png",
	];

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
	if (
		!form.value.receivedDate ||
		!form.value.receivedBy ||
		!form.value.signedDeliveryChallan
	) {
		showToast({
			message: "Please complete the receipt details and upload the signed delivery challan.",
			variant: "danger",
		});
		return;
	}

	submitting.value = true;

	try {
		// TODO: Replace with the actual Frappe API call.
		//
		// await frappe.call({
		// 	method: "vision_empower.vision_empower.api.confirm_delivery",
		// 	args: {
		// 		pr_id: prId,
		// 		received_date: form.value.receivedDate,
		// 		received_by: form.value.receivedBy,
		// 		remarks: form.value.remarks,
		// 		signed_delivery_challan:
		// 			form.value.signedDeliveryChallan,
		// 	},
		// });

		showToast({
			message: "Delivery confirmed and procurement request closed.",
			variant: "success",
		});

		router.push({
			name: "dashboard",
		});
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

			<form class="ve-form-grid" @submit.prevent="confirmReceipt">
				<!-- Received Date -->
				<div class="ve-field">
					<label class="ve-field-label">
						Received Date
					</label>

					<input
						v-model="form.receivedDate"
						class="ve-field-input"
						type="date"
						required
					/>
				</div>

				<!-- Received By -->
				<div class="ve-field">
					<label class="ve-field-label">
						Received By
					</label>

					<input
						v-model="form.receivedBy"
						class="ve-field-input"
						type="text"
						placeholder="e.g. School SPOC — Priya Sharma"
						required
					/>
				</div>

				<!-- Remarks -->
				<div
					class="ve-field"
					style="grid-column: 1 / -1"
				>
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
				<div
					class="ve-field"
					style="grid-column: 1 / -1"
				>
					<label class="ve-field-label">
						Signed Delivery Challan
					</label>

					<div
						class="ve-delivery-dropzone"
						:class="{
							've-delivery-dropzone--active': isDragging,
						}"
						@dragover.prevent="isDragging = true"
						@dragleave.prevent="isDragging = false"
						@drop.prevent="handleDrop"
					>
						<div
							v-if="!form.signedDeliveryChallan"
							class="ve-delivery-upload-content"
						>
							<div class="ve-delivery-upload-title">
								Drop signed delivery challan here
							</div>

							<div class="ve-delivery-upload-subtitle">
								or click to browse
							</div>

							<label
								class="ve-button ve-button--primary ve-delivery-browse"
							>
								Choose File
								<input
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									@change="handleFileInput"
								/>
							</label>

							<div class="ve-delivery-upload-hint">
								PDF, JPG or PNG
							</div>
						</div>

						<div
							v-else
							class="ve-delivery-file"
						>
							<div>
								<div class="ve-delivery-file-name">
									{{ form.signedDeliveryChallan.name }}
								</div>

								<div class="ve-table-secondary">
									{{
										(
											form.signedDeliveryChallan.size /
											1024 /
											1024
										).toFixed(2)
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
								? "Closing..."
								: "Confirm Receipt and Close PR"
						}}
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>