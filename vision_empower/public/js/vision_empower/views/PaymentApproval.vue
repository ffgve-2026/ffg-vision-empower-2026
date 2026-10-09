<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";
import { callApi, uploadFile, formatInr } from "../utils/api";

const route = useRoute();
const router = useRouter();

// Client-side only — hides the invoice upload/decision for roles that
// can't act on this step. The backend independently enforces the same
// role on the actual decide_payment_approval call, which is the real
// security boundary.
const canAct = userHasAnyRole(PR_STEP_ROLES.paymentApproval);

const prId = route.params.prId;

const pr = ref(null);
const isOpen = computed(() => pr.value?.stage === "payment-approval");

const vendor = computed(() => ({
	name: pr.value?.purchase_order?.vendor_name || "—",
	amount: pr.value?.purchase_order?.total_amount || 0,
	po: pr.value?.purchase_order?.name || "",
}));

const invoice = ref({
	number: "",
	date: new Date().toISOString().split("T")[0],
	amount: "",
	gst: "",
	remarks: "",
});

onMounted(async () => {
	pr.value = await callApi("get_purchase_requisition_status", { pr_id: prId });
	invoice.value.amount = vendor.value.amount || "";
});

const invoiceFile = ref(null);
const submitting = ref(false);
const isDragging = ref(false);

const formattedAmount = formatInr;

function handleFile(file) {
	if (!file) return;

	// Keep this restricted to invoice/document formats for now.
	const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

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

async function decide(decision) {
	submitting.value = true;
	try {
		const file = invoiceFile.value ? await uploadFile(invoiceFile.value) : null;
		const result = await callApi("decide_payment_approval", {
			pr_id: prId,
			decision,
			invoice_number: invoice.value.number,
			invoice_date: invoice.value.date,
			amount: invoice.value.amount,
			gst_amount: invoice.value.gst,
			remarks: invoice.value.remarks,
			file_url: file?.file_url || "",
		});
		showToast({
			message: result.message,
			variant: decision === "approve" ? "success" : "warning",
		});
		router.push({ name: "procurement-status", params: { prId } });
	} catch (error) {
		showToast({ message: "Could not record the payment decision.", variant: "danger" });
		throw error;
	} finally {
		submitting.value = false;
	}
}

function approvePayment() {
	if (!invoiceFile.value || !invoice.value.number) {
		showToast({
			message:
				"Enter the invoice number and upload the vendor invoice before approving payment.",
			variant: "danger",
		});
		return;
	}
	decide("approve");
}

function requestRevision() {
	if (!invoice.value.remarks.trim()) {
		showToast({ message: "Add remarks explaining what needs revising.", variant: "danger" });
		return;
	}
	decide("request_revision");
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Payment Approval</h2>
			<p class="ve-subtitle">Submit the vendor invoice for payment approval</p>
		</div>
		<ProcurementPipeline currentStage="payment-approval" />

		<!-- Payment Summary -->
		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Payment Details</h2>
					<p class="ve-subtitle">Procurement request {{ prId }}</p>
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
					<span class="ve-context-label">Purchase Order</span>
					<span class="ve-payment-summary-value">{{ vendor.po || "—" }}</span>
				</div>

				<div class="ve-payment-summary-item">
					<span class="ve-context-label">PO Amount</span>
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
					<p class="ve-subtitle">Upload the invoice received from the selected vendor</p>
				</div>
			</template>

			<p v-if="!canAct" class="ve-subtitle">
				Your role doesn't approve payments — this step is view-only for you.
			</p>

			<p v-else-if="pr && !isOpen" class="ve-subtitle">
				Payment approval isn't pending — this request is at "{{ pr.stage_label }}".
			</p>

			<template v-else-if="pr">
				<div class="ve-form-grid" style="margin-bottom: 1rem">
					<div class="ve-field">
						<label class="ve-field-label">Invoice Number</label>
						<input
							v-model="invoice.number"
							class="ve-field-input"
							type="text"
							required
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Invoice Date</label>
						<input v-model="invoice.date" class="ve-field-input" type="date" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Invoice Amount (₹)</label>
						<input
							v-model="invoice.amount"
							class="ve-field-input"
							type="number"
							min="0"
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label"
							>GST Amount (₹)
							<span class="ve-field-optional">(optional)</span></label
						>
						<input
							v-model="invoice.gst"
							class="ve-field-input"
							type="number"
							min="0"
						/>
					</div>
					<div class="ve-field" style="grid-column: 1 / -1">
						<label class="ve-field-label"
							>Remarks
							<span class="ve-field-optional">(required for revision)</span></label
						>
						<textarea
							v-model="invoice.remarks"
							class="ve-field-input ve-field-textarea"
							rows="2"
						/>
					</div>
				</div>

				<div
					class="ve-invoice-dropzone"
					:class="{ 've-invoice-dropzone--active': isDragging }"
					@dragover.prevent="isDragging = true"
					@dragleave.prevent="isDragging = false"
					@drop.prevent="handleDrop"
				>
					<div v-if="!invoiceFile" class="ve-invoice-upload-content">
						<div class="ve-invoice-upload-title">Drop your invoice here</div>

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
					Ensure the uploaded invoice matches the approved vendor and payment amount
					before submitting for approval.
				</div>

				<div class="ve-payment-actions">
					<button
						type="button"
						class="ve-outline-button"
						:disabled="submitting"
						@click="requestRevision"
					>
						Request Revision
					</button>

					<button
						type="button"
						class="ve-button ve-button--primary"
						:disabled="submitting"
						@click="approvePayment"
					>
						{{ submitting ? "Saving..." : "Approve Payment" }}
					</button>
				</div>
			</template>
		</BaseWidget>
	</div>
</template>
