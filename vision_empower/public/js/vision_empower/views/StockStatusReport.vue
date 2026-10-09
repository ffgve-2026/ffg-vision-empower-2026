<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import KpiWidget from "../components/KpiWidget.vue";
import { callApi } from "../utils/api";

const router = useRouter();

// Matches the Item DocType's category Select options.
const CATEGORIES = ["Books", "STEM", "CT", "Lab", "Braille", "IT", "AT"];

const categoryFilter = ref("");
const loading = ref(true);
const kpis = ref({});
const stock = ref([]);

async function load() {
	loading.value = true;
	try {
		const data = await callApi("get_stock_status_report", { category: categoryFilter.value });
		kpis.value = data.kpis;
		stock.value = data.items;
	} finally {
		loading.value = false;
	}
}

onMounted(load);
watch(categoryFilter, load);

const statusBadge = {
	"Below Reorder": "inactive",
	"Zero Stock": "inactive",
	"Stock OK": "active",
};

function exportPdf() {
	window.print();
}

function openItem(row) {
	router.push({ name: "item-detail", params: { itemId: row.id } });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Stock Status Report</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<select v-model="categoryFilter" class="ve-field-input" style="max-width: 200px">
					<option value="">All Categories</option>
					<option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
				</select>
				<div class="ve-toolbar-spacer" />
				<button class="ve-button ve-button--primary" @click="exportPdf">Export PDF</button>
			</div>
		</BaseWidget>

		<div class="ve-kpi-grid">
			<KpiWidget label="ITEMS IN HAND" :value="kpis.items_in_hand?.value || '—'" :note="kpis.items_in_hand?.note" accent="var(--ve-primary)" />
			<KpiWidget label="BELOW REORDER" :value="kpis.below_reorder?.value || '—'" :note="kpis.below_reorder?.note" note-variant="warning" accent="var(--ve-warning)" />
			<KpiWidget label="ZERO STOCK" :value="kpis.zero_stock?.value || '—'" :note="kpis.zero_stock?.note" note-variant="danger" accent="var(--ve-danger)" />
			<KpiWidget label="NEVER DISPATCHED" :value="kpis.never_dispatched?.value || '—'" :note="kpis.never_dispatched?.note" accent="var(--ve-success)" />
		</div>

		<BaseWidget :loading="loading">
			<p class="ve-subtitle" style="margin-bottom: 0.75rem">
				In hand = opening stock + quantities on paid purchase orders − quantities dispatched to schools.
			</p>
			<div class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Item ID</th>
							<th>Item Name</th>
							<th>Category</th>
							<th>Total Procured</th>
							<th>Total Dispatched</th>
							<th>In Hand</th>
							<th>Reorder Level</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in stock" :key="row.id">
							<td @click="openItem(row)"><span class="ve-link">{{ row.id }}</span></td>
							<td>{{ row.name }}</td>
							<td>{{ row.category }}</td>
							<td>{{ row.procured }}</td>
							<td>{{ row.dispatched }}</td>
							<td>{{ row.inHand }}</td>
							<td>{{ row.reorderLevel }}</td>
							<td>
								<span
									v-if="row.status === 'Zero Stock'"
									class="ve-pill ve-pill--danger"
								>
									{{ row.status }}
								</span>
								<span
									v-else
									class="ve-status-text"
									:class="`ve-status-text--${statusBadge[row.status]}`"
								>
									{{ row.status }}
								</span>
							</td>
						</tr>
						<tr v-if="!loading && !stock.length">
							<td colspan="8" class="ve-table-secondary">No active items.</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
