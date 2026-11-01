<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
import { PR_STEP_ROLES, userHasAnyRole } from "../config/roles";
import { callApi, getList, uploadFile, formatInr, formatDate } from "../utils/api";

const route = useRoute();
const router = useRouter();

const prId = route.params.prId;

// Client-side only — hides quotation entry/selection for roles that can't
// act on this step. The backend independently enforces the same role on
// add_vendor_quotation/close_quotation_collection, the real boundary.
const canAct = userHasAnyRole(PR_STEP_ROLES.quotation);

const pr = ref(null);
const quotations = ref([]);
const vendors = ref([]);
const selectedVendor = ref(null);

const isOpen = computed(() => ["quotations", "vendor-selection"].includes(pr.value?.stage));

const emptyForm = () => ({
	vendor: "",
	quoteRef: "",
	quotationDate: new Date().toISOString().split("T")[0],
	// item_id -> unit price quoted; prefilled from the vendor's Vendor Prices.
	prices: {},
	deliveryDays: "",
	validUntil: "",
	file: null,
});
const form = ref(emptyForm());
const adding = ref(false);
const proceeding = ref(false);

async function load() {
	pr.value = await callApi("get_purchase_requisition_status", { pr_id: prId });
	quotations.value = pr.value.quotations;
}

onMounted(async () => {
	await load();
	if (canAct)
		vendors.value = await getList(
			"Vendor",
			["name", "vendor_name"],
			{ active: 1 },
			"vendor_name asc"
		);
});

// The quote is priced per line; its total is the sum (PO lines copy these).
const quoteLines = computed(() =>
	(pr.value?.record.line_items || []).map((row) => ({
		...row,
		amount: (Number(form.value.prices[row.item_id]) || 0) * row.qty,
	}))
);
const quoteTotal = computed(() => quoteLines.value.reduce((sum, row) => sum + row.amount, 0));

async function onVendorChange() {
	const prices = {};
	if (form.value.vendor) {
		// Latest effective price first, so the first row per item wins.
		const rows = await callApi("list_vendor_item_prices", { vendor: form.value.vendor });
		for (const row of rows) prices[row.item] ??= row.unit_price;
	}
	form.value.prices = Object.fromEntries(
		(pr.value?.record.line_items || []).map((row) => [row.item_id, prices[row.item_id] ?? ""])
	);
}

function selectVendor(quotation) {
	if (!canAct || !isOpen.value) return;
	selectedVendor.value = quotation;
}

const fileInput = ref(null);

function onFile(event) {
	form.value.file = event.target.files?.[0] || null;
}

// Clears the picked document (the input keeps showing its name otherwise).
function clearFile() {
	form.value.file = null;
	if (fileInput.value) fileInput.value.value = "";
}

async function addQuotation() {
	if (!form.value.vendor || quoteLines.value.some((row) => !(row.amount > 0))) {
		showToast({
			message: "Choose the vendor and enter a unit price for every item.",
			variant: "danger",
		});
		return;
	}

	adding.value = true;
	try {
		const file = form.value.file ? await uploadFile(form.value.file) : null;
		const result = await callApi("add_vendor_quotation", {
			pr_id: prId,
			vendor: form.value.vendor,
			line_prices: JSON.stringify(form.value.prices),
			quote_ref: form.value.quoteRef,
			quotation_date: form.value.quotationDate,
			delivery_days: form.value.deliveryDays,
			valid_until: form.value.validUntil,
			file_url: file?.file_url || "",
		});
		showToast({ message: result.message, variant: "success" });
		form.value = emptyForm();
		clearFile();
		await load();
	} catch (error) {
		showToast({ message: "Could not add the quotation.", variant: "danger" });
		throw error;
	} finally {
		adding.value = false;
	}
}

async function proceedWithVendor() {
	if (!selectedVendor.value) {
		showToast({ message: "Please select a vendor before proceeding.", variant: "danger" });
		return;
	}

	proceeding.value = true;
	try {
		await callApi("close_quotation_collection", { pr_id: prId });
		router.push({
			name: "procurement-vendor-selection",
			params: { prId },
			query: { quotation: selectedVendor.value.name },
		});
	} finally {
		proceeding.value = false;
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Vendor Quotations</h2>
			<p class="ve-subtitle">
				Compare quotations received for procurement request {{ prId }}
			</p>
		</div>

		<ProcurementPipeline currentStage="quotations" />

		<BaseWidget :loading="!pr">
			<div v-if="pr" class="ve-pr-context">
				<div class="ve-pr-context-item">
					<span class="ve-context-label">Procurement Request</span>
					<span class="ve-context-value ve-context-value--strong">{{ prId }}</span>
				</div>
				<div class="ve-pr-context-item">
					<span class="ve-context-label">{{ pr.record.kit ? "Kit" : "Item" }}</span>
					<span class="ve-context-value">{{ pr.record.item }}</span>
				</div>
				<div class="ve-pr-context-item">
					<span class="ve-context-label">Quantity</span>
					<span class="ve-context-value">{{ pr.record.quantity }}</span>
				</div>
				<div class="ve-pr-context-item">
					<span class="ve-context-label">Stage</span>
					<span class="ve-status ve-status--success">{{ pr.stage_label }}</span>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget v-if="canAct && isOpen">
			<template #header>
				<h2 class="ve-widget-title">Add Quotation</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="addQuotation">
				<div class="ve-field">
					<label class="ve-field-label">Vendor</label>
					<select
						v-model="form.vendor"
						class="ve-field-input"
						required
						@change="onVendorChange"
					>
						<option value="" disabled>Select vendor</option>
						<option v-for="v in vendors" :key="v.name" :value="v.name">
							{{ v.vendor_name }} ({{ v.name }})
						</option>
					</select>
				</div>
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Line Prices</label>
					<table class="ve-data-table ve-quote-lines">
						<thead>
							<tr>
								<th>Item</th>
								<th>Qty</th>
								<th>Unit Price (₹)</th>
								<th>Amount</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="row in quoteLines" :key="row.item_id">
								<td>{{ row.item_name }}</td>
								<td>{{ row.qty }}</td>
								<td>
									<input
										v-model="form.prices[row.item_id]"
										class="ve-field-input"
										type="number"
										min="0"
										step="0.01"
										:aria-label="`Unit price for ${row.item_name}`"
										required
									/>
								</td>
								<td>{{ formatInr(row.amount) }}</td>
							</tr>
						</tbody>
						<tfoot>
							<tr>
								<th colspan="3">Total</th>
								<th>{{ formatInr(quoteTotal) }}</th>
							</tr>
						</tfoot>
					</table>
					<p class="ve-field-hint">
						Prefilled from the vendor's prices in Master Data — change them to match
						the quotation. The purchase order uses these prices.
					</p>
				</div>
				<div class="ve-field">
					<label class="ve-field-label"
						>Quotation Ref <span class="ve-field-optional">(optional)</span></label
					>
					<input v-model="form.quoteRef" class="ve-field-input" type="text" />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Quotation Date</label>
					<input v-model="form.quotationDate" class="ve-field-input" type="date" />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Delivery (days)</label>
					<input
						v-model="form.deliveryDays"
						class="ve-field-input"
						type="number"
						min="0"
					/>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Valid Until</label>
					<input v-model="form.validUntil" class="ve-field-input" type="date" />
				</div>
				<div class="ve-field">
					<label class="ve-field-label"
						>Quotation Document
						<span class="ve-field-optional">(optional)</span></label
					>
					<input
						ref="fileInput"
						class="ve-field-input"
						type="file"
						accept=".pdf,.jpg,.jpeg,.png"
						@change="onFile"
					/>
					<button
						v-if="form.file"
						type="button"
						class="ve-link-button ve-link-button--danger"
						style="align-self: flex-start; margin-top: 0.25rem"
						@click="clearFile"
					>
						Remove {{ form.file.name }}
					</button>
				</div>
				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button type="submit" class="ve-button ve-button--primary" :disabled="adding">
						{{ adding ? "Adding..." : "Add Quotation" }}
					</button>
				</div>
			</form>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Quotation Comparison</h2>
					<p class="ve-subtitle">{{ quotations.length }} quotations received</p>
				</div>
			</template>

			<div class="ve-table-wrapper">
				<table class="ve-quotation-table">
					<thead>
						<tr>
							<th v-if="canAct && isOpen" class="ve-quotation-select"></th>
							<th>Vendor</th>
							<th>Quotation</th>
							<th>Total Amount</th>
							<th>Delivery</th>
							<th>Valid Until</th>
							<th>Status</th>
						</tr>
					</thead>

					<tbody>
						<tr
							v-for="quotation in quotations"
							:key="quotation.name"
							:class="{
								've-quotation-row--selected':
									selectedVendor?.name === quotation.name,
							}"
							@click="selectVendor(quotation)"
						>
							<td v-if="canAct && isOpen" class="ve-quotation-select">
								<input
									type="radio"
									name="vendor"
									:value="quotation.name"
									:checked="selectedVendor?.name === quotation.name"
									@change="selectVendor(quotation)"
									@click.stop
								/>
							</td>
							<td>
								<div class="ve-vendor-name">{{ quotation.vendor_name }}</div>
							</td>
							<td>
								<div class="ve-quotation-ref">
									<a
										v-if="quotation.attachment"
										:href="quotation.attachment"
										target="_blank"
										class="ve-link"
										@click.stop
									>
										{{ quotation.quote_ref || quotation.name }}
									</a>
									<template v-else>{{
										quotation.quote_ref || quotation.name
									}}</template>
								</div>
								<div class="ve-table-secondary">
									{{ formatDate(quotation.quotation_date) }}
								</div>
							</td>
							<td>
								<div class="ve-quotation-amount">
									{{ formatInr(quotation.total_amount) }}
								</div>
							</td>
							<td>
								<span class="ve-delivery"
									>{{ quotation.delivery_days || 0 }} days</span
								>
							</td>
							<td>{{ formatDate(quotation.valid_until) || "—" }}</td>
							<td>{{ quotation.status }}</td>
						</tr>
						<tr v-if="!quotations.length">
							<td colspan="7" class="ve-table-secondary">
								No quotations recorded yet.
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="!canAct" class="ve-subtitle" style="margin-top: 1rem">
				Your role doesn't collect quotations or select vendors — this step is view-only for
				you.
			</div>

			<div v-else-if="!isOpen && pr" class="ve-subtitle" style="margin-top: 1rem">
				Quotation collection is closed — this request is at "{{ pr.stage_label }}".
			</div>

			<div v-else-if="selectedVendor" class="ve-quotation-footer">
				<div>
					<span class="ve-context-label">Selected Vendor</span>
					<div class="ve-selected-vendor">{{ selectedVendor.vendor_name }}</div>
					<div class="ve-table-secondary">
						{{ formatInr(selectedVendor.total_amount) }} ·
						{{ selectedVendor.delivery_days || 0 }} day delivery
					</div>
				</div>

				<button
					type="button"
					class="ve-button ve-button--primary"
					:disabled="proceeding"
					@click="proceedWithVendor"
				>
					Proceed with Vendor
				</button>
			</div>

			<div v-else-if="quotations.length" class="ve-quotation-empty-selection">
				Select a vendor to proceed with the procurement.
			</div>
		</BaseWidget>
	</div>
</template>
