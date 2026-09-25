<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
const route = useRoute();
const router = useRouter();

const prId = route.params.prId || "PR-00024";

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

	const allowedTypes = [
		"application/pdf",
		"image/jpeg",
		"image/png",
	];

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
	if (
		!form.value.dispatchDate ||
		!form.value.transporter ||
		!form.value.lrDocketNumber
	) {
		showToast({
			message: "Please complete all required dispatch details.",
			variant: "danger",
		});
		return;
	}

	submitting.value = true;

	try {
		// TODO: Replace with the actual Frappe API call.
		//
		// await frappe.call({
		// 	method: "vision_empower.vision_empower.api.initiate_dispatch",
		// 	args: {
		// 		pr_id: prId,
		// 		dispatch_date: form.value.dispatchDate,
		// 		transporter: form.value.transporter,
		// 		lr_docket_number: form.value.lrDocketNumber,
		// 		transport_certificate: form.value.transportCertificate,
		// 	},
		// });

		showToast({
			message: "Dispatch initiated successfully.",
			variant: "success",
		});

		router.push({
            name: "delivery-confirmation",
            params: {
                prId,
            },
        });
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
			<p class="ve-subtitle">
				Record dispatch details for procurement request {{ prId }}
			</p>
		</div>
		<ProcurementPipeline currentStage="dispatch" />

		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Dispatch Details</h2>
					<p class="ve-subtitle">
						Enter the details of the shipment being dispatched
					</p>
				</div>
			</template>

			<form class="ve-form-grid" @submit.prevent="initiateDispatch">
				<!-- Dispatch Date -->
				<div class="ve-field">
					<label class="ve-field-label">
						Dispatch Date
					</label>

					<input
						v-model="form.dispatchDate"
						class="ve-field-input"
						type="date"
						required
					/>
				</div>

				<!-- Transporter -->
				<div class="ve-field">
					<label class="ve-field-label">
						Transporter
					</label>

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
					<label class="ve-field-label">
						LR / Docket Number
					</label>

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
						<div
							v-if="!form.transportCertificate"
							class="ve-dispatch-upload-content"
						>
							<div class="ve-dispatch-upload-title">
								Drop TI here
							</div>

							<div class="ve-dispatch-upload-subtitle">
								or click to browse
							</div>

							<label
								class="ve-button ve-button--primary ve-dispatch-browse"
							>
								Choose File
								<input
									type="file"
									accept=".pdf,.jpg,.jpeg,.png"
									@change="handleFileInput"
								/>
							</label>

							<div class="ve-dispatch-upload-hint">
								PDF, JPG or PNG · Optional
							</div>
						</div>

						<div v-else class="ve-dispatch-file">
							<div>
								<div class="ve-dispatch-file-name">
									{{ form.transportCertificate.name }}
								</div>

								<div class="ve-table-secondary">
									{{
										(
											form.transportCertificate.size /
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

				<div
					class="ve-form-actions"
					style="grid-column: 1 / -1; justify-content: flex-end"
				>
					<button
						type="submit"
						class="ve-button ve-button--primary"
						:disabled="submitting"
					>
						{{
							submitting
								? "Initiating..."
								: "Initiate Dispatch"
						}}
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>