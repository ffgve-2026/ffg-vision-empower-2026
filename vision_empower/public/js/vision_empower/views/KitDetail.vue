<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();
const canManage = userHasAnyRole([ROLES.ADMIN]);

const kit = ref({ id: "", kit_name: "", kit_code: "", description: "", active: 0 });
const items = ref([]);
const loading = ref(false);
const error = ref("");

const editing = ref(false);
const editForm = ref({ kit_name: "", kit_code: "", description: "" });
const saving = ref(false);

async function loadKit() {
	loading.value = true;
	error.value = "";

	try {
		const response = await frappe.call({
			method: "frappe.client.get",
			args: { doctype: "Kit", name: route.params.kitId },
		});

		const data = response.message;
		if (!data) throw new Error("Kit not found");

		kit.value = {
			id: data.name,
			kit_name: data.kit_name || "-",
			kit_code: data.kit_code || "-",
			description: data.description || "-",
			active: data.active,
		};

		const kitItemsResponse = await frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Kit Item",
				fields: ["name", "item", "quantity", "uom"],
				filters: { parent: kit.value.id, parenttype: "Kit" },
				parent: "Kit",
				limit_page_length: 100,
			},
		});

		const kitItemRows = kitItemsResponse.message || [];

		if (kitItemRows.length) {
			const itemIds = [...new Set(kitItemRows.map((row) => row.item))];
			const itemsResponse = await frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Item",
					fields: ["name", "item_name", "unit"],
					filters: { name: ["in", itemIds] },
					limit_page_length: 500,
				},
			});
			const itemsById = {};
			(itemsResponse.message || []).forEach((i) => {
				itemsById[i.name] = i;
			});

			items.value = kitItemRows.map((row) => ({
				id: row.item,
				name: itemsById[row.item]?.item_name || row.item,
				unit: row.uom || itemsById[row.item]?.unit || "-",
				qty: row.quantity,
			}));
		} else {
			items.value = [];
		}
	} catch (err) {
		console.error("Failed to load kit:", err);
		error.value = "Failed to load kit.";
	} finally {
		loading.value = false;
	}
}

onMounted(loadKit);

function startEdit() {
	editForm.value = {
		kit_name: kit.value.kit_name,
		kit_code: kit.value.kit_code,
		description: kit.value.description === "-" ? "" : kit.value.description,
	};
	editing.value = true;
}

function cancelEdit() {
	editing.value = false;
}

async function saveEdit() {
	saving.value = true;

	try {
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Kit",
				name: kit.value.id,
				fieldname: {
					...editForm.value,
				},
			},
		});

		showToast({ message: "Kit updated.", variant: "success" });
		editing.value = false;
		await loadKit();
	} catch (err) {
		console.error("Failed to update kit:", err);
		showToast({ message: "Failed to update kit.", variant: "error" });
	} finally {
		saving.value = false;
	}
}

async function deleteKit() {
	if (!window.confirm(`Delete kit "${kit.value.kit_name}"? This cannot be undone.`)) return;

	try {
		await frappe.call({
			method: "frappe.client.delete",
			args: { doctype: "Kit", name: kit.value.id },
		});

		showToast({ message: "Kit deleted.", variant: "success" });
		router.push({ name: "kits" });
	} catch (err) {
		console.error("Failed to delete kit:", err);
		showToast({ message: "Failed to delete kit.", variant: "error" });
	}
}

function openItem(itemId) {
	router.push({ name: "item-detail", params: { itemId } });
}
</script>

<template>
	<div class="ve-view">
		<div v-if="loading" class="ve-pagination-note">Loading kit...</div>
		<div v-else-if="error" class="ve-pagination-note">{{ error }}</div>

		<template v-else>
			<BaseWidget>
				<div class="ve-detail-header">
					<div class="ve-detail-header-left">
						<h2 class="ve-widget-title">{{ kit.kit_name }}</h2>
						<span class="ve-status-text" :class="`ve-status-text--${kit.active ? 'active' : 'inactive'}`">
							{{ kit.active ? "Active" : "Inactive" }}
						</span>
					</div>
					<div v-if="canManage && !editing" class="ve-detail-actions">
						<button class="ve-link-button" @click="startEdit">Edit Details</button>
						<button class="ve-outline-button ve-outline-button--danger" @click="deleteKit">
							Delete Kit
						</button>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget>
				<template #header>
					<h2 class="ve-widget-title">Kit Definition</h2>
				</template>

				<form v-if="editing" class="ve-form-grid" @submit.prevent="saveEdit">
					<div class="ve-field" style="grid-column: 1 / -1">
						<label class="ve-field-label">Kit Name</label>
						<input v-model="editForm.kit_name" class="ve-field-input" type="text" required />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Kit Code</label>
						<input v-model="editForm.kit_code" class="ve-field-input" type="text" required />
					</div>
					<div class="ve-field" style="grid-column: 1 / -1">
						<label class="ve-field-label">Description</label>
						<input v-model="editForm.description" class="ve-field-input" type="text" />
					</div>
					<div class="ve-form-actions" style="grid-column: 1 / -1">
						<button type="submit" class="ve-button ve-button--primary" :disabled="saving">
							{{ saving ? "Saving..." : "Save" }}
						</button>
						<button type="button" class="ve-outline-button" @click="cancelEdit">Cancel</button>
					</div>
				</form>

				<div v-else class="ve-detail-grid">
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Kit ID</span>
						<span class="ve-detail-field-value ve-detail-field-value--disabled">{{ kit.id }}</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Kit Code</span>
						<span class="ve-detail-field-value">{{ kit.kit_code }}</span>
					</div>
					<div class="ve-detail-field" style="grid-column: 1 / -1">
						<span class="ve-detail-field-label">Description</span>
						<span class="ve-detail-field-value">{{ kit.description }}</span>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget v-if="items.length > 0">
				<template #header>
					<h2 class="ve-widget-title">Items in This Kit</h2>
				</template>

				<div class="ve-table-wrapper">
					<table class="ve-data-table">
						<thead>
							<tr>
								<th>Item ID</th>
								<th>Item Name</th>
								<th>Unit</th>
								<th>Qty per Kit</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="i in items" :key="i.id">
								<td @click="openItem(i.id)"><span class="ve-link">{{ i.id }}</span></td>
								<td @click="openItem(i.id)">{{ i.name }}</td>
								<td>{{ i.unit }}</td>
								<td>{{ i.qty }}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</BaseWidget>
			<BaseWidget v-else>
				<p class="ve-subtitle">No items added to this kit yet.</p>
			</BaseWidget>
		</template>
	</div>
</template>
