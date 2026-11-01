<script setup>
import { ref, computed, onMounted } from "vue";
import BaseWidget from "../components/BaseWidget.vue";
import ExportCsvButton from "../components/ExportCsvButton.vue";
import ImportCsvButton from "../components/ImportCsvButton.vue";
import { showToast } from "../components/toast/useToast";
import { ROLES, userHasAnyRole } from "../config/roles";
import { callApi, getList } from "../utils/api";

// Client-side only — save_warehouse re-checks the role.
const canManage = userHasAnyRole([ROLES.ADMIN]);

const WAREHOUSE_TYPES = ["Central", "Field"];

const warehouses = ref([]);
const loading = ref(true);
const search = ref("");

const emptyForm = () => ({
	name: "",
	warehouseName: "",
	warehouseType: "Central",
	address: "",
	active: true,
});
const form = ref(emptyForm());
const saving = ref(false);
const editing = computed(() => Boolean(form.value.name));

async function load() {
	loading.value = true;
	try {
		warehouses.value = await getList(
			"Warehouse",
			["name", "warehouse_name", "warehouse_type", "address", "active"],
			{},
			"warehouse_name asc"
		);
	} catch (error) {
		console.error("Failed to load warehouses:", error);
		showToast({ message: "Could not load warehouses.", variant: "danger" });
	} finally {
		loading.value = false;
	}
}

onMounted(load);

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return warehouses.value;
	return warehouses.value.filter((w) =>
		[w.warehouse_name, w.warehouse_type, w.address].some((v) =>
			(v || "").toLowerCase().includes(term)
		)
	);
});

function editWarehouse(w) {
	form.value = {
		name: w.name,
		warehouseName: w.warehouse_name,
		warehouseType: w.warehouse_type || "Central",
		address: w.address || "",
		active: Boolean(w.active),
	};
	window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveWarehouse(values, successMessage) {
	saving.value = true;
	try {
		const result = await callApi("save_warehouse", {
			name: values.name,
			warehouse_name: values.warehouseName,
			warehouse_type: values.warehouseType,
			address: values.address,
			active: values.active ? 1 : 0,
		});
		showToast({ message: successMessage || result.message, variant: "success" });
		return true;
	} catch (error) {
		console.error("Failed to save warehouse:", error);
		showToast({ message: "Could not save the warehouse.", variant: "danger" });
		return false;
	} finally {
		saving.value = false;
	}
}

async function save() {
	if (await saveWarehouse(form.value)) {
		form.value = emptyForm();
		await load();
	}
}

async function setActive(w, active) {
	const values = {
		name: w.name,
		warehouseName: w.warehouse_name,
		warehouseType: w.warehouse_type,
		address: w.address,
		active,
	};
	if (await saveWarehouse(values, active ? "Warehouse activated." : "Warehouse deactivated."))
		await load();
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Warehouses</h2>
			<p class="ve-subtitle">
				Stores that stock is moved between with Location Transfers. Only active warehouses
				can be picked on a transfer.
			</p>
		</div>

		<BaseWidget v-if="canManage">
			<template #header>
				<h2 class="ve-widget-title">
					{{ editing ? "Edit Warehouse" : "Add Warehouse" }}
				</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="save">
				<div class="ve-field">
					<label class="ve-field-label">Warehouse Name</label>
					<input
						v-model="form.warehouseName"
						class="ve-field-input"
						type="text"
						required
						placeholder="e.g. Central Warehouse - Patna"
					/>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Warehouse Type</label>
					<select v-model="form.warehouseType" class="ve-field-input" required>
						<option v-for="t in WAREHOUSE_TYPES" :key="t" :value="t">{{ t }}</option>
					</select>
				</div>
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label"
						>Address <span class="ve-field-optional">(optional)</span></label
					>
					<textarea v-model="form.address" class="ve-field-input" rows="2" />
				</div>
				<label class="ve-checkbox-item" style="grid-column: 1 / -1">
					<input v-model="form.active" type="checkbox" />
					Active
				</label>
				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button
						v-if="editing"
						type="button"
						class="ve-outline-button"
						@click="form = emptyForm()"
					>
						Cancel
					</button>
					<button type="submit" class="ve-button ve-button--primary" :disabled="saving">
						{{ saving ? "Saving..." : editing ? "Update Warehouse" : "Add Warehouse" }}
					</button>
				</div>
			</form>
		</BaseWidget>

		<BaseWidget>
			<div class="ve-toolbar">
				<input
					v-model="search"
					class="ve-toolbar-search"
					type="text"
					placeholder="Search warehouses by name, type, address..."
				/>
				<div class="ve-toolbar-spacer" />
				<div class="ve-toolbar-actions">
					<ExportCsvButton doctype="Warehouse" />
					<ImportCsvButton v-if="canManage" doctype="Warehouse" @imported="load" />
				</div>
			</div>

			<div class="ve-table-wrapper" style="margin-top: 1rem">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Warehouse Name</th>
							<th>Type</th>
							<th>Address</th>
							<th>Status</th>
							<th v-if="canManage"></th>
						</tr>
					</thead>
					<tbody>
						<tr v-if="loading">
							<td :colspan="canManage ? 5 : 4" class="ve-table-secondary">
								Loading warehouses...
							</td>
						</tr>
						<tr v-for="w in filtered" v-else :key="w.name">
							<td>{{ w.warehouse_name }}</td>
							<td>{{ w.warehouse_type || "-" }}</td>
							<td>{{ w.address || "-" }}</td>
							<td>
								<span
									class="ve-status-text"
									:class="`ve-status-text--${w.active ? 'active' : 'inactive'}`"
								>
									{{ w.active ? "Active" : "Inactive" }}
								</span>
							</td>
							<td v-if="canManage">
								<button class="ve-link-button" @click="editWarehouse(w)">
									Edit
								</button>
								<button
									v-if="w.active"
									class="ve-link-button ve-link-button--danger"
									@click="setActive(w, false)"
								>
									Deactivate
								</button>
								<button v-else class="ve-link-button" @click="setActive(w, true)">
									Activate
								</button>
							</td>
						</tr>
						<tr v-if="!loading && !filtered.length">
							<td :colspan="canManage ? 5 : 4" class="ve-table-secondary">
								{{ search ? "No warehouses match." : "No warehouses yet." }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
