<script setup>
import { ref, computed } from "vue";
import BaseWidget from "../components/BaseWidget.vue";
import KpiWidget from "../components/KpiWidget.vue";
import { showToast } from "../components/toast/useToast";
import { downloadCsv } from "../utils/csv";

const LEDGER_CSV_COLUMNS = [
	{ label: "Vendor Name", key: "vendor" },
	{ label: "PO Count", key: "poCount" },
	{ label: "Total Value", key: "total" },
	{ label: "Paid Amount", key: "paid" },
	{ label: "Pending Amount", key: "pending" },
	{ label: "Overall Status", key: "status" },
];

const vendorFilter = ref("All");
const funderFilter = ref("Tata Trusts");

const topVendors = [
	{ name: "Apex Educational Supplies", amount: 3450000 },
	{ name: "Hindustan Medicals Ltd.", amount: 2820000 },
	{ name: "National Book Trust", amount: 1900000 },
	{ name: "Reliance Digital NGO Solutions", amount: 1240000 },
	{ name: "Gita Press Publications", amount: 980000 },
	{ name: "Tata Steel CSR Procurement", amount: 850000 },
	{ name: "Srinivasa Logistics", amount: 610000 },
	{ name: "BioGen Lab Instruments", amount: 420000 },
];

const maxAmount = Math.max(...topVendors.map((v) => v.amount));

const ledger = [
	{ vendor: "Apex Educational Supplies", poCount: 34, total: "₹34,50,000", paid: "₹30,00,000", pending: "₹4,50,000", status: "Awaiting Invoice" },
	{ vendor: "Hindustan Medicals Ltd.", poCount: 28, total: "₹28,20,000", paid: "₹28,20,000", pending: "₹0", status: "Fully Settled" },
	{ vendor: "National Book Trust", poCount: 19, total: "₹19,00,000", paid: "₹15,10,000", pending: "₹3,90,000", status: "In Verification" },
	{ vendor: "Reliance Digital NGO Solutions", poCount: 12, total: "₹12,40,000", paid: "₹12,40,000", pending: "₹0", status: "Fully Settled" },
	{ vendor: "Gita Press Publications", poCount: 9, total: "₹9,80,000", paid: "₹9,80,000", pending: "₹0", status: "Fully Settled" },
];

const statusVariant = {
	"Fully Settled": "active",
	"Awaiting Invoice": "inactive",
	"In Verification": "active",
};

const formattedAmount = (amount) =>
	new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

function exportCsv() {
	downloadCsv("vision-empower-procurement-summary", ledger, LEDGER_CSV_COLUMNS);
	showToast({ message: `Exported ${ledger.length} row(s) to CSV.`, variant: "success" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Procurement Summary Report</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<span class="ve-subtitle">01 Apr 2025 – 31 Mar 2026</span>
				<select v-model="vendorFilter" class="ve-field-input" style="max-width: 160px">
					<option>All</option>
				</select>
				<select v-model="funderFilter" class="ve-field-input" style="max-width: 180px">
					<option>Tata Trusts</option>
				</select>
				<div class="ve-toolbar-spacer" />
				<button class="ve-button ve-button--primary" @click="exportCsv">Export CSV</button>
			</div>
		</BaseWidget>

		<div class="ve-kpi-grid">
			<KpiWidget label="TOTAL POS" value="142 Issued" note="YTD Actionable" accent="var(--ve-primary)" />
			<KpiWidget label="TOTAL SPEND" value="₹1.2 Cr" note="Committed budget" accent="var(--ve-success)" />
			<KpiWidget label="PENDING PAYMENTS" value="₹8.4 Lakhs" note="Awaiting invoice" note-variant="warning" accent="var(--ve-warning)" />
			<KpiWidget label="AVG LEAD TIME" value="12 Days" note="PR to Dispatch" accent="var(--ve-danger)" />
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Top 8 Vendors by Cumulative Spend (YTD)</h2>
			</template>

			<div class="ve-bar-chart">
				<div v-for="v in topVendors" :key="v.name" class="ve-bar-row">
					<span class="ve-bar-label">{{ v.name }}</span>
					<div class="ve-bar-track">
						<div class="ve-bar-fill" :style="{ width: (v.amount / maxAmount) * 100 + '%' }" />
					</div>
					<span class="ve-bar-value">{{ formattedAmount(v.amount) }}</span>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Detailed Vendor Transaction Ledger</h2>
			</template>

			<div class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Vendor Name</th>
							<th>PO Count</th>
							<th>Total Value</th>
							<th>Paid Amount</th>
							<th>Pending Amount</th>
							<th>Overall Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in ledger" :key="row.vendor">
							<td>{{ row.vendor }}</td>
							<td>{{ row.poCount }} POs</td>
							<td>{{ row.total }}</td>
							<td>{{ row.paid }}</td>
							<td>{{ row.pending }}</td>
							<td>
								<span class="ve-status-text" :class="`ve-status-text--${statusVariant[row.status]}`">
									{{ row.status }}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
