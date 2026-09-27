<script setup>
import { ref } from "vue";
import BaseWidget from "../components/BaseWidget.vue";
import KpiWidget from "../components/KpiWidget.vue";
import { showToast } from "../components/toast/useToast";

const categoryFilter = ref("All Kits & Supplies");
const warehouseFilter = ref("Central Hub – Patna");

const stock = [
	{ id: "VE-MED-001", name: "First-Aid Kits (Grade A)", category: "Medical Kits", procured: 1200, dispatched: 1188, inHand: 12, reorderLevel: 50, status: "Below Reorder" },
	{ id: "VE-SOL-012", name: "Solar Lanterns (Heavy Duty)", category: "Logistics & Energy", procured: 500, dispatched: 495, inHand: 5, reorderLevel: 30, status: "Below Reorder" },
	{ id: "VE-EDU-056", name: "Primary Math Textbooks", category: "Education Kits", procured: 3000, dispatched: 2955, inHand: 45, reorderLevel: 100, status: "Below Reorder" },
	{ id: "VE-WAT-090", name: "Water Purification Tablets", category: "Sanitation Supplies", procured: 5000, dispatched: 4880, inHand: 120, reorderLevel: 500, status: "Below Reorder" },
	{ id: "VE-SAN-002", name: "Eco Sanitary Napkins", category: "Sanitation Supplies", procured: 1500, dispatched: 1420, inHand: 80, reorderLevel: 200, status: "Below Reorder" },
	{ id: "VE-MED-009", name: "ORS Hydration Packs", category: "Medical Kits", procured: 800, dispatched: 800, inHand: 0, reorderLevel: 100, status: "Zero Stock" },
	{ id: "VE-EDU-011", name: "Teacher Training Manuals", category: "Education Kits", procured: 450, dispatched: 200, inHand: 250, reorderLevel: 50, status: "Stock OK" },
];

const statusBadge = {
	"Below Reorder": "inactive",
	"Zero Stock": "inactive",
	"Stock OK": "active",
};

function syncRfid() {
	showToast({ message: "RFID sync isn't wired up yet.", variant: "warning" });
}

function exportPdf() {
	showToast({ message: "PDF export isn't wired up yet.", variant: "warning" });
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
					<option>All Kits & Supplies</option>
				</select>
				<select v-model="warehouseFilter" class="ve-field-input" style="max-width: 200px">
					<option>Central Hub – Patna</option>
				</select>
				<div class="ve-toolbar-spacer" />
				<button class="ve-outline-button" @click="syncRfid">Sync RFID</button>
				<button class="ve-button ve-button--primary" @click="exportPdf">Export PDF</button>
			</div>
		</BaseWidget>

		<div class="ve-kpi-grid">
			<KpiWidget label="ITEMS IN HAND" value="2,341 Units" note="Active count in Patna & Gaya Hubs" accent="var(--ve-primary)" />
			<KpiWidget label="BELOW REORDER" value="18 Items" note="Awaiting PR creation approval" note-variant="warning" accent="var(--ve-warning)" />
			<KpiWidget label="ZERO STOCK" value="3 Items" note="Out of stock / critical need" note-variant="danger" accent="var(--ve-danger)" />
			<KpiWidget label="NEVER DISPATCHED" value="7 Items" note="New inventory / trial phase" accent="var(--ve-success)" />
		</div>

		<BaseWidget>
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
							<td><span class="ve-link">{{ row.id }}</span></td>
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
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
