<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { downloadCsv } from "../utils/csv";
import { callApi } from "../utils/api";

const router = useRouter();
const TIME_RANGES = [
	{ value: "last_90_days", label: "Last 90 Days" },
	{ value: "this_month", label: "This Month" },
	{ value: "this_fy", label: "This Financial Year" },
	{ value: "", label: "All Time" },
];

const stateFilter = ref("");
const timeRange = ref("last_90_days");
const states = ref([]);
const schools = ref([]);
const kitsSent = ref(0);
const kitsPending = ref(0);
const dispatchedPercent = ref(0);
const loading = ref(true);

async function load() {
	loading.value = true;
	try {
		const data = await callApi("get_dispatch_status_report", {
			state: stateFilter.value,
			time_range: timeRange.value,
		});
		kitsSent.value = data.kpis.kits_sent;
		kitsPending.value = data.kpis.kits_pending;
		dispatchedPercent.value = data.kpis.delivered_percent;
		states.value = data.states;
		schools.value = data.schools;
	} finally {
		loading.value = false;
	}
}

onMounted(load);
watch([stateFilter, timeRange], load);

const radius = 60;
const circumference = 2 * Math.PI * radius;
const dispatchedDash = computed(() => (dispatchedPercent.value / 100) * circumference);

function openDispatch(row) {
	router.push({ name: "procurement-status", params: { prId: row.pr } });
}

const SCHOOL_DISPATCH_CSV_COLUMNS = [
	{ label: "School Name", key: "name" },
	{ label: "DC Number", key: "dc" },
	{ label: "State", key: "state" },
	{ label: "Kits Sent", key: "kits" },
	{ label: "Delivery Date", key: "date" },
	{ label: "Confirmed Status", value: (row) => (row.confirmed ? "Confirmed" : "Pending") },
	{ label: "Follow-up Action", key: "action" },
];

function downloadReport() {
	downloadCsv("vision-empower-dispatch-status", schools.value, SCHOOL_DISPATCH_CSV_COLUMNS);
	showToast({ message: `Exported ${schools.value.length} row(s) to CSV.`, variant: "success" });
}

function viewDiscrepancyLog() {
	router.push({ name: "dispatch" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Dispatch & Delivery Status</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<select v-model="stateFilter" class="ve-field-input" style="max-width: 160px">
					<option value="">All States</option>
					<option v-for="st in states" :key="st" :value="st">{{ st }}</option>
				</select>
				<select v-model="timeRange" class="ve-field-input" style="max-width: 180px">
					<option v-for="r in TIME_RANGES" :key="r.value" :value="r.value">
						{{ r.label }}
					</option>
				</select>
				<div class="ve-toolbar-spacer" />
				<button class="ve-button ve-button--primary" @click="downloadReport">
					Download Report
				</button>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Dispatch Coverage & Performance Tracker</h2>
			</template>

			<div class="ve-donut-layout">
				<svg viewBox="0 0 160 160" class="ve-donut">
					<circle cx="80" cy="80" :r="radius" class="ve-donut-track" />
					<circle
						cx="80"
						cy="80"
						:r="radius"
						class="ve-donut-fill"
						:stroke-dasharray="`${dispatchedDash} ${circumference}`"
						transform="rotate(-90 80 80)"
					/>
					<text x="80" y="76" class="ve-donut-percent">{{ dispatchedPercent }}%</text>
					<text x="80" y="94" class="ve-donut-label">DISPATCHED</text>
				</svg>

				<div class="ve-donut-legend">
					<div class="ve-donut-legend-item">
						<span class="ve-donut-swatch ve-donut-swatch--primary" />
						Delivered: <strong>{{ kitsSent.toLocaleString("en-IN") }} Kits</strong>
					</div>
					<div class="ve-donut-legend-item">
						<span class="ve-donut-swatch ve-donut-swatch--muted" />
						In Transit: <strong>{{ kitsPending.toLocaleString("en-IN") }} Kits</strong>
					</div>
					<p class="ve-subtitle" style="margin-top: 0.5rem">
						Share of dispatched quantity confirmed delivered, for the selected state
						and period.
					</p>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<div class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>School Name</th>
							<th>State</th>
							<th>DC Number</th>
							<th>Qty Sent</th>
							<th>Delivery Date</th>
							<th>Confirmed Status</th>
							<th>Follow-up Action</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="s in schools" :key="s.dc">
							<td>{{ s.name }}</td>
							<td>{{ s.state }}</td>
							<td @click="openDispatch(s)">
								<span class="ve-link">{{ s.dc }}</span>
							</td>
							<td>{{ s.kits }}</td>
							<td>{{ s.date }}</td>
							<td>
								<span
									class="ve-status-text"
									:class="`ve-status-text--${
										s.confirmed ? 'active' : 'inactive'
									}`"
								>
									{{ s.confirmed ? "✓ Confirmed" : "✕ Pending" }}
								</span>
							</td>
							<td>{{ s.action }}</td>
						</tr>
						<tr v-if="!loading && !schools.length">
							<td colspan="7" class="ve-table-secondary">
								No dispatches in this period.
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-form-actions" style="margin-top: 1rem">
				<button class="ve-outline-button" @click="viewDiscrepancyLog">
					View Delivery Discrepancy Log →
				</button>
			</div>
		</BaseWidget>
	</div>
</template>
