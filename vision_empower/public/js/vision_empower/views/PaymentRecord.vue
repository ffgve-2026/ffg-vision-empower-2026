<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast.js";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();

// Client-side only — hides the payment form for roles that can't act on
// this step. The backend independently enforces the same role on the
// actual record_payment call, which is the real security boundary.
const canAct = userHasAnyRole(PR_STEP_ROLES.payment);

const prId = route.params.prId || "PR-00024";

const form = ref({
	amount: Number(route.query.totalAmount) || 235000,
	advancePercentage: "",
	paymentMode: "",
	paymentDate: "",
	utrNumber: "",
	bankAccount: "",
	remarks: "",
});

const submitting = ref(false);

const paymentModes = [
	"NEFT",
	"RTGS",
	"IMPS",
	"UPI",
	"Bank Transfer",
	"Cheque",
];

const bankAccounts = [
	"Vision Empower — HDFC Bank **** 4821",
	"Vision Empower — SBI **** 7314",
];

const formattedAmount = (amount) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(amount);

async function recordPayment() {
	if (
		!form.value.amount ||
		!form.value.paymentMode ||
		!form.value.paymentDate ||
		!form.value.utrNumber ||
		!form.value.bankAccount
	) {
		showToast({
			message: "Please complete all required payment details.",
			variant: "danger",
		});
		return;
	}

	submitting.value = true;

	try {
		// TODO: Replace with the actual Frappe API call.
		//
		// await frappe.call({
		// 	method: "vision_empower.vision_empower.api.record_payment",
		// 	args: {
		// 		pr_id: prId,
		// 		amount: form.value.amount,
		// 		advance_percentage: form.value.advancePercentage,
		// 		payment_mode: form.value.paymentMode,
		// 		payment_date: form.value.paymentDate,
		// 		utr_number: form.value.utrNumber,
		// 		bank_account: form.value.bankAccount,
		// 		remarks: form.value.remarks,
		// 	},
		// });

		showToast({
			message: "Payment details recorded successfully.",
			variant: "success",
		});

		router.push({
	    name: "dispatch-initiation",
	    params: {
		    prId,
	    },
});
	} catch (error) {
		showToast({
			message: "Could not record the payment details.",
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
			<h2>Record Payment</h2>
			<p class="ve-subtitle">
				Record the payment made for procurement request {{ prId }}
			</p>
		</div>
		<ProcurementPipeline currentStage="payment" />

		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Payment Details</h2>
					<p class="ve-subtitle">
						Enter the details of the payment made to the vendor
					</p>
				</div>
			</template>

			<p v-if="!canAct" class="ve-subtitle">
				Your role doesn't record payments — this step is view-only for you.
			</p>

			<form v-else class="ve-form-grid" @submit.prevent="recordPayment">
				<!-- Amount -->
				<div class="ve-field">
					<label class="ve-field-label">Amount</label>

					<input
						v-model="form.amount"
						class="ve-field-input"
						type="number"
						min="0"
						readonly
					/>

					<span class="ve-field-hint">
						Approved payment amount: {{ formattedAmount(form.amount) }}
					</span>
				</div>

				<!-- Advance % -->
				<div class="ve-field">
					<label class="ve-field-label">
						Advance %
					</label>

					<input
						v-model="form.advancePercentage"
						class="ve-field-input"
						type="number"
						min="0"
						max="100"
						placeholder="e.g. 50"
					/>
				</div>

				<!-- Payment Mode -->
				<div class="ve-field">
					<label class="ve-field-label">
						Payment Mode
					</label>

					<select
						v-model="form.paymentMode"
						class="ve-field-input"
						required
					>
						<option value="" disabled>Select payment mode</option>

						<option
							v-for="mode in paymentModes"
							:key="mode"
							:value="mode"
						>
							{{ mode }}
						</option>
					</select>
				</div>

				<!-- Payment Date -->
				<div class="ve-field">
					<label class="ve-field-label">
						Payment Date
					</label>

					<input
						v-model="form.paymentDate"
						class="ve-field-input"
						type="date"
						required
					/>
				</div>

				<!-- UTR -->
				<div class="ve-field">
					<label class="ve-field-label">
						UTR Number
					</label>

					<input
						v-model="form.utrNumber"
						class="ve-field-input"
						type="text"
						placeholder="Enter UTR / transaction reference"
						required
					/>
				</div>

				<!-- Bank Account -->
				<div class="ve-field">
					<label class="ve-field-label">
						Bank Account
					</label>

					<select
						v-model="form.bankAccount"
						class="ve-field-input"
						required
					>
						<option value="" disabled>Select bank account</option>

						<option
							v-for="account in bankAccounts"
							:key="account"
							:value="account"
						>
							{{ account }}
						</option>
					</select>
				</div>

				<!-- Remarks -->
				<div
					class="ve-field"
					style="grid-column: 1 / -1"
				>
					<label class="ve-field-label">
						Remarks <span class="ve-field-optional">(Optional)</span>
					</label>

					<textarea
						v-model="form.remarks"
						class="ve-field-textarea"
						placeholder="Add any additional payment remarks..."
					></textarea>
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
						{{ submitting ? "Recording..." : "Record Payment" }}
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>