<script setup>
import { ref, computed, onMounted, watch } from "vue";
import BaseWidget from "../components/BaseWidget.vue";
import KpiWidget from "../components/KpiWidget.vue";
import { showToast } from "../components/toast/useToast";
import { downloadCsv } from "../utils/csv";
import { callApi, getList, formatInr } from "../utils/api";

const LEDGER_CSV_COLUMNS = [
	{ label: "Vendor Name", key: "vendor" },
	{ label: "PO Count", key: "poCount" },
	{ label: "Total Value", key: "total" },
	{ label: "Paid Amount", key: "paid" },
	{ label: "Pending Amount", key: "pending" },
	{ label: "Overall Status", key: "status" },
];

const DATE_RANGES = [
	{ value: "this_fy", label: "This Financial Year" },
	{ value: "this_month", label: "This Month" },
	{ value: "last_90_days", label: "Last 90 Days" },
	{ value: "", label: "All Time" },
];

const dateRange = ref("this_fy");
const vendorFilter = ref("");
const funderFilter = ref("");
const vendors = ref([]);
const funders = ref([]);

const loading = ref(true);
const kpis = ref({});
const topVendors = ref([]);
const ledger = ref([]);

async function load() {
	loading.value = true;
	try {
		const data = await callApi("get_procurement_summary_report", {
			date_range: dateRange.value,
			vendor: vendorFilter.value,
			funder: funderFilter.value,
		});
		kpis.value = data.kpis;
		topVendors.value = data.top_vendor_spend;
		ledger.value = data.vendor_transactions;
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	load();
	[vendors.value, funders.value] = await Promise.all([
		getList("Vendor", ["name", "vendor_name"], {}, "vendor_name asc"),
		getList("Funder", ["name", "funder_name"], {}, "funder_name asc"),
	]);
});
watch([dateRange, vendorFilter, funderFilter], load);

const maxAmount = computed(() => Math.max(1, ...topVendors.value.map((v) => v.amount)));

const statusVariant = {
	"Fully Settled": "active",
	"Awaiting Invoice": "inactive",
	"Awaiting Payment": "inactive",
};

const formattedAmount = formatInr;

function exportCsv() {
	downloadCsv("vision-empower-procurement-summary", ledger.value, LEDGER_CSV_COLUMNS);
	showToast({ message: `Exported ${ledger.value.length} row(s) to CSV.`, variant: "success" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Procurement Summary Report</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<select v-model="dateRange" class="ve-field-input" style="max-width: 180px">
					<option v-for="r in DATE_RANGES" :key="r.value" :value="r.value">{{ r.label }}</option>
				</select>
				<select v-model="vendorFilter" class="ve-field-input" style="max-width: 180px">
					<option value="">All Vendors</option>
					<option v-for="v in vendors" :key="v.name" :value="v.name">{{ v.vendor_name }}</option>
				</select>
				<select v-model="funderFilter" class="ve-field-input" style="max-width: 180px">
					<option value="">All Funders</option>
					<option v-for="f in funders" :key="f.name" :value="f.name">{{ f.funder_name || f.name }}</option>
				</select>
				<div class="ve-toolbar-spacer" />
				<button class="ve-button ve-button--primary" @click="exportCsv">Export CSV</button>
			</div>
		</BaseWidget>

		<div class="ve-kpi-grid">
			<KpiWidget label="TOTAL POS" :value="kpis.total_pos?.value || '—'" :note="kpis.total_pos?.note" accent="var(--ve-primary)" />
			<KpiWidget label="TOTAL SPEND" :value="kpis.total_spend?.value || '—'" :note="kpis.total_spend?.note" accent="var(--ve-success)" />
			<KpiWidget label="PENDING PAYMENTS" :value="kpis.pending_payments?.value || '—'" :note="kpis.pending_payments?.note" note-variant="warning" accent="var(--ve-warning)" />
			<KpiWidget label="AVG LEAD TIME" :value="kpis.avg_lead_time?.value || '—'" :note="kpis.avg_lead_time?.note" accent="var(--ve-danger)" />
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Top 8 Vendors by Spend</h2>
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
						<tr v-if="!loading && !ledger.length">
							<td colspan="6" class="ve-table-secondary">No purchase orders in this period.</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
