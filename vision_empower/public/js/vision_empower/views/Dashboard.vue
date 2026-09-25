<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import KpiWidget from "../components/KpiWidget.vue";
import { getDashboardWidgetsForUser } from "../config/dashboardWidgets";

const router = useRouter();
const widgets = getDashboardWidgetsForUser();

const loading = ref(true);
const kpis = ref(null);
const reorderAlerts = ref([]);
const pendingApprovals = ref([]);
const spendTrend = ref([]);

async function loadDashboard() {
	loading.value = true;

	try {
		const response = await frappe.call({
			method: "vision_empower.vision_empower.api.get_dashboard_kpis",
		});

		// Server only sends sections the caller's role is permitted to see
		// (see DASHBOARD_WIDGETS_BY_ROLE in api.py) — fields the response
		// omits are left at their empty defaults below.
		const data = response.message;
		kpis.value = data.kpis || null;
		reorderAlerts.value = data.reorder_alerts || [];
		pendingApprovals.value = data.pending_approvals || [];
		spendTrend.value = data.spend_trend || [];
	} finally {
		loading.value = false;
	}
}

function createPr() {
	router.push({ name: "procurement-new-requisition" });
}

function goToApproval(pr) {
	router.push({
		name: "procurement-approval",
		params: { prId: pr.pr },
		query: { item: pr.item, requestedBy: pr.requested_by, date: pr.date },
	});
}

// Simple inline SVG area chart — avoids adding a charting dependency,
// which risks the same build-tooling issues already hit with frappe-ui's
// newer components on this Frappe version.
const chartWidth = 560;
const chartHeight = 160;
const chartPadding = 24;

const chartPoints = computed(() => {
	if (spendTrend.value.length === 0) return [];

	const amounts = spendTrend.value.map((d) => d.amount);
	const max = Math.max(...amounts);
	const min = 0;
	const stepX = (chartWidth - chartPadding * 2) / (spendTrend.value.length - 1);

	return spendTrend.value.map((d, i) => {
		const x = chartPadding + i * stepX;
		const y =
			chartHeight -
			chartPadding -
			((d.amount - min) / (max - min)) * (chartHeight - chartPadding * 2);
		return { x, y, ...d };
	});
});

const linePath = computed(() =>
	chartPoints.value.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
);

const areaPath = computed(() => {
	if (chartPoints.value.length === 0) return "";
	const first = chartPoints.value[0];
	const last = chartPoints.value[chartPoints.value.length - 1];
	return `${linePath.value} L ${last.x} ${chartHeight - chartPadding} L ${first.x} ${chartHeight - chartPadding} Z`;
});

onMounted(() => {
	loadDashboard();
});
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>NGO Operations Dashboard</h2>
		</div>

		<template v-if="widgets.kpis">
			<div class="ve-kpi-grid">
				<KpiWidget
					:loading="loading"
					label="TOTAL PO VALUE THIS MONTH"
					:value="kpis?.total_po_value_this_month.value ?? ''"
					:note="kpis?.total_po_value_this_month.change"
					note-variant="success"
					accent="var(--ve-primary)"
				/>
				<KpiWidget
					:loading="loading"
					label="ITEMS BELOW REORDER"
					:value="kpis?.items_below_reorder.value ?? ''"
					:note="kpis?.items_below_reorder.note"
					note-variant="danger"
					accent="var(--ve-danger)"
				/>
				<KpiWidget
					:loading="loading"
					label="SCHOOLS DISPATCHED"
					:value="kpis?.schools_dispatched.value ?? ''"
					:progress-percent="kpis?.schools_dispatched.percent ?? null"
					accent="var(--ve-success)"
				/>
				<KpiWidget
					:loading="loading"
					label="PENDING PAYMENTS"
					:value="kpis?.pending_payments.value ?? ''"
					:note="kpis?.pending_payments.note"
					note-variant="warning"
					accent="var(--ve-warning)"
				/>
			</div>
		</template>

		<div class="ve-two-col">
			<BaseWidget v-if="widgets.reorderAlerts" :loading="loading">
				<template #header>
					<h2 class="ve-widget-title">Critical Reorder Alerts</h2>
				</template>

				<div v-for="alert in reorderAlerts" :key="alert.item" class="ve-alert-row">
					<div>
						<div class="ve-alert-item">{{ alert.item }}</div>
						<div class="ve-subtitle">Min Level Req: {{ alert.min_level }}</div>
					</div>
					<div class="ve-alert-right">
						<span class="ve-pill ve-pill--danger">
							{{ alert.units_left }} {{ alert.unit }} Left
						</span>
						<button class="ve-link-button" @click="createPr">Create PR →</button>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget v-if="widgets.pendingApprovals" :loading="loading">
				<template #header>
					<h2 class="ve-widget-title">Pending PR Approvals</h2>
				</template>

				<div v-for="pr in pendingApprovals" :key="pr.pr" class="ve-approval-row">
					<div>
						<span class="ve-link">{{ pr.pr }}</span>
						<span class="ve-subtitle"> · {{ pr.date }}</span>
						<div class="ve-alert-item">{{ pr.item }}</div>
						<div class="ve-subtitle">Req by: {{ pr.requested_by }}</div>
					</div>
					<div class="ve-alert-right">
						<button class="ve-link-button ve-link-button--danger" @click="goToApproval(pr)">
							Reject
						</button>
						<button class="ve-outline-button ve-outline-button--success" @click="goToApproval(pr)">
							Approve
						</button>
					</div>
				</div>
			</BaseWidget>
		</div>

		<BaseWidget v-if="widgets.spendTrend" :loading="loading">
			<template #header>
				<h2 class="ve-widget-title">6-Month Procurement Spend Trend (YTD)</h2>
			</template>

			<svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="ve-chart">
				<path :d="areaPath" class="ve-chart-area" />
				<path :d="linePath" class="ve-chart-line" />
				<g v-for="p in chartPoints" :key="p.month">
					<circle :cx="p.x" :cy="p.y" r="3" class="ve-chart-dot" />
					<text :x="p.x" :y="chartHeight - 4" class="ve-chart-label">{{ p.month }}</text>
				</g>
			</svg>
		</BaseWidget>
	</div>
</template>
