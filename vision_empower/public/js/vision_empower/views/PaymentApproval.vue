<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";

const route = useRoute();
const router = useRouter();


const prId = route.params.prId || "PR-00024";

const vendor = ref({
	name: route.query.vendor || "ABC Educational Supplies",
	amount: Number(route.query.totalAmount) || 235000,
}); 

const invoiceFile = ref(null);
const submitting = ref(false);
const isDragging = ref(false);

const formattedAmount = (amount) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(amount);

function handleFile(file) {
	if (!file) return;

	// Keep this restricted to invoice/document formats for now.
	const allowedTypes = [
		"application/pdf",
		"image/jpeg",
		"image/png",
	];

	if (!allowedTypes.includes(file.type)) {
		showToast({
			message: "Please upload a PDF, JPG or PNG invoice.",
			variant: "danger",
		});
		return;
	}

	invoiceFile.value = file;
}

function handleFileInput(event) {
	handleFile(event.target.files?.[0]);
}

function handleDrop(event) {
	isDragging.value = false;
	handleFile(event.dataTransfer.files?.[0]);
}

function removeFile() {
	invoiceFile.value = null;
}

function approvePayment() {
	if (!invoiceFile.value) {
		showToast({
			message: "Please upload the vendor invoice before approving payment.",
			variant: "danger",
		});
		return;
	}

	showToast({
		message: "Payment approved successfully.",
		variant: "success",
	});

    router.push({
		name: "procurement-payment-recording",
		params: {
			prId,
		}
	});
}

function requestRevision() {
	router.push({
		name: "dashboard",
	});
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Payment Approval</h2>
			<p class="ve-subtitle">
				Submit the vendor invoice for payment approval
			</p>
		</div>
		<ProcurementPipeline currentStage="payment-approval" />

		<!-- Payment Summary -->
		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Payment Details</h2>
					<p class="ve-subtitle">
						Procurement request {{ prId }}
					</p>
				</div>
			</template>

			<div class="ve-payment-summary">
				<div class="ve-payment-summary-item">
					<span class="ve-context-label">Vendor</span>
					<span class="ve-payment-summary-value">
						{{ vendor.name }}
					</span>
				</div>

				<div class="ve-payment-summary-item">
					<span class="ve-context-label">Payment Amount</span>
					<span class="ve-payment-summary-value ve-payment-summary-value--amount">
						{{ formattedAmount(vendor.amount) }}
					</span>
				</div>
			</div>
		</BaseWidget>

		<!-- Invoice Upload -->
		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Vendor Invoice (PI)</h2>
					<p class="ve-subtitle">
						Upload the invoice received from the selected vendor
					</p>
				</div>
			</template>

			<div
				class="ve-invoice-dropzone"
				:class="{ 've-invoice-dropzone--active': isDragging }"
				@dragover.prevent="isDragging = true"
				@dragleave.prevent="isDragging = false"
				@drop.prevent="handleDrop"
			>
				<div v-if="!invoiceFile" class="ve-invoice-upload-content">
					<div class="ve-invoice-upload-title">
						Drop your invoice here
					</div>

					<div class="ve-invoice-upload-subtitle">
						or click to browse from your computer
					</div>

					<label class="ve-button ve-button--primary ve-invoice-browse">
						Choose Invoice
						<input
							type="file"
							accept=".pdf,.jpg,.jpeg,.png"
							@change="handleFileInput"
						/>
					</label>

					<div class="ve-invoice-upload-hint">
						PDF, JPG or PNG · Maximum file size 10 MB
					</div>
				</div>

				<div v-else class="ve-invoice-file">
					<div>
						<div class="ve-invoice-file-name">
							{{ invoiceFile.name }}
						</div>

						<div class="ve-table-secondary">
							{{ (invoiceFile.size / 1024 / 1024).toFixed(2) }} MB
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

			<div class="ve-payment-note">
				Ensure the uploaded invoice matches the approved vendor and payment
				amount before submitting for approval.
			</div>

            <div class="ve-payment-actions">
                <button
                    type="button"
                    class="ve-outline-button"
                    @click="requestRevision"
                >
                    Request Revision
                </button>

                <button
                    type="button"
                    class="ve-button ve-button--primary"
                    @click="approvePayment"
                >
                    Approve Payment
                </button>
            </div>
		</BaseWidget>
	</div>
</template>