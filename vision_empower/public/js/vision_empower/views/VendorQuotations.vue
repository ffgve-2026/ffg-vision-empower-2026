<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import ProcurementPipeline from "../components/ProcurementPipeline.vue";
const route = useRoute();
const router = useRouter();

const prId = route.params.prId || "PR-00024";

const selectedVendor = ref(null);

const quotations = ref([
	{
		id: 1,
		vendor: "ABC Educational Supplies",
		quotationRef: "QT-1024",
		quotationDate: "18 Sep 2026",
		totalAmount: 235000,
		deliveryDays: 10,
		validUntil: "18 Oct 2026",
	},
	{
		id: 2,
		vendor: "XYZ Learning Solutions",
		quotationRef: "QT-1025",
		quotationDate: "19 Sep 2026",
		totalAmount: 248500,
		deliveryDays: 7,
		validUntil: "20 Oct 2026",
	},
	{
		id: 3,
		vendor: "Global Education Partners",
		quotationRef: "QT-1026",
		quotationDate: "19 Sep 2026",
		totalAmount: 262000,
		deliveryDays: 14,
		validUntil: "25 Oct 2026",
	},
	{
		id: 4,
		vendor: "Bharat School Solutions",
		quotationRef: "QT-1027",
		quotationDate: "20 Sep 2026",
		totalAmount: 241500,
		deliveryDays: 9,
		validUntil: "20 Oct 2026",
	},
]);

const formattedAmount = (amount) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(amount);

function selectVendor(quotation) {
	selectedVendor.value = quotation;
}

function proceedWithVendor() {
	if (!selectedVendor.value) {
		showToast({
			message: "Please select a vendor before proceeding.",
			variant: "danger",
		});
		return;
	}
  router.push({ name: "procurement-vendor-selection", params: {
			prId,
		} });
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

		<BaseWidget>
			<div class="ve-pr-context">
				<div class="ve-pr-context-item">
					<span class="ve-context-label">Procurement Request</span>
					<span class="ve-context-value ve-context-value--strong">
						{{ prId }}
					</span>
				</div>

				<div class="ve-pr-context-item">
					<span class="ve-context-label">Kit Type</span>
					<span class="ve-context-value">
						CT Learning Kit — Primary
					</span>
				</div>

				<div class="ve-pr-context-item">
					<span class="ve-context-label">Quantity</span>
					<span class="ve-context-value">150 Kits</span>
				</div>

				<div class="ve-pr-context-item">
					<span class="ve-context-label">Status</span>
					<span class="ve-status ve-status--success">Approved</span>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<div>
					<h2 class="ve-widget-title">Quotation Comparison!!!</h2>
					<p class="ve-subtitle">
						{{ quotations.length }} quotations received
					</p>
				</div>
			</template>

			<div class="ve-table-wrapper">
				<table class="ve-quotation-table">
					<thead>
						<tr>
							<th class="ve-quotation-select"></th>
							<th>Vendor</th>
							<th>Quotation</th>
							<th>Total Amount</th>
							<th>Delivery</th>
							<th>Valid Until</th>
						</tr>
					</thead>

					<tbody>
						<tr
							v-for="quotation in quotations"
							:key="quotation.id"
							:class="{
								've-quotation-row--selected':
									selectedVendor?.id === quotation.id,
							}"
							@click="selectVendor(quotation)"
						>
							<td class="ve-quotation-select">
								<input
									type="radio"
									name="vendor"
									:value="quotation.id"
									:checked="selectedVendor?.id === quotation.id"
									@change="selectVendor(quotation)"
									@click.stop
								/>
							</td>

							<td>
								<div class="ve-vendor-name">
									{{ quotation.vendor }}
								</div>
							</td>

							<td>
								<div class="ve-quotation-ref">
									{{ quotation.quotationRef }}
								</div>
								<div class="ve-table-secondary">
									{{ quotation.quotationDate }}
								</div>
							</td>

							<td>
								<div class="ve-quotation-amount">
									{{ formattedAmount(quotation.totalAmount) }}
								</div>
							</td>

							<td>
								<span class="ve-delivery">
									{{ quotation.deliveryDays }} days
								</span>
							</td>

							<td>{{ quotation.validUntil }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="selectedVendor" class="ve-quotation-footer">
				<div>
					<span class="ve-context-label">Selected Vendor</span>
					<div class="ve-selected-vendor">
						{{ selectedVendor.vendor }}
					</div>
					<div class="ve-table-secondary">
						{{ formattedAmount(selectedVendor.totalAmount) }}
						· {{ selectedVendor.deliveryDays }} day delivery
					</div>
				</div>

				<button
					type="button"
					class="ve-button ve-button--primary"
					@click="proceedWithVendor"
				>
					Proceed with Vendor
				</button>
			</div>

			<div v-else class="ve-quotation-empty-selection">
				Select a vendor to proceed with the procurement.
			</div>
		</BaseWidget>
	</div>
</template>