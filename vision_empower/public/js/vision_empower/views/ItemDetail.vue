<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();
const canManage = userHasAnyRole([ROLES.ADMIN]);

const CATEGORIES = ["Books", "STEM", "CT", "Lab", "Braille", "IT", "AT"];

const item = ref({ id: "", name: "", category: "-", unit: "-", norm: 0, active: 0 });
const loading = ref(false);
const error = ref("");

const editing = ref(false);
const editForm = ref({});
const saving = ref(false);

async function loadItem() {
	loading.value = true;
	error.value = "";

	try {
		const response = await frappe.call({
			method: "frappe.client.get",
			args: { doctype: "Item", name: route.params.itemId },
		});

		const data = response.message;
		if (!data) throw new Error("Item not found");

		item.value = {
			id: data.name,
			name: data.item_name || "-",
			category: data.category || "-",
			unit: data.unit || "-",
			norm: data.school_norm_qty ?? 0,
			active: data.active,
		};
	} catch (err) {
		console.error("Failed to load item:", err);
		error.value = "Failed to load item.";
	} finally {
		loading.value = false;
	}
}

onMounted(loadItem);

function startEdit() {
	editForm.value = {
		item_name: item.value.name,
		category: item.value.category === "-" ? CATEGORIES[0] : item.value.category,
		unit: item.value.unit === "-" ? "" : item.value.unit,
		school_norm_qty: item.value.norm || 0,
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
				doctype: "Item",
				name: item.value.id,
				fieldname: {
					...editForm.value,
					school_norm_qty: Number(editForm.value.school_norm_qty) || 0,
				},
			},
		});

		showToast({ message: "Item updated.", variant: "success" });
		editing.value = false;
		await loadItem();
	} catch (err) {
		console.error("Failed to update item:", err);
		showToast({ message: "Failed to update item.", variant: "error" });
	} finally {
		saving.value = false;
	}
}

async function setItemActive(active) {
	const verb = active ? "Reactivate" : "Discontinue";
	if (!window.confirm(`${verb} item "${item.value.name}"?`)) return;

	try {
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Item",
				name: item.value.id,
				fieldname: "active",
				value: active ? 1 : 0,
			},
		});

		showToast({
			message: active ? "Item reactivated." : "Item discontinued.",
			variant: "success",
		});
		await loadItem();
	} catch (err) {
		console.error(`Failed to ${verb.toLowerCase()} item:`, err);
		showToast({ message: `Failed to ${verb.toLowerCase()} item.`, variant: "error" });
	}
}
</script>

<template>
	<div class="ve-view">
		<div v-if="loading" class="ve-pagination-note">Loading item...</div>
		<div v-else-if="error" class="ve-pagination-note">{{ error }}</div>

		<template v-else>
			<BaseWidget>
				<div class="ve-detail-header">
					<div class="ve-detail-header-left">
						<h2 class="ve-widget-title">{{ item.name }}</h2>
						<span
							class="ve-badge"
							:class="`ve-badge--${CATEGORY_BADGE[item.category] || 'gray'}`"
						>
							{{ item.category }}
						</span>
						<span
							class="ve-status-text"
							:class="`ve-status-text--${item.active ? 'active' : 'inactive'}`"
						>
							{{ item.active ? "Active" : "Discontinued" }}
						</span>
					</div>
					<div v-if="canManage && !editing" class="ve-detail-actions">
						<button class="ve-link-button" @click="startEdit">Edit Details</button>
						<button
							v-if="item.active"
							class="ve-outline-button ve-outline-button--danger"
							@click="setItemActive(false)"
						>
							Discontinue Item
						</button>
						<button v-else class="ve-outline-button" @click="setItemActive(true)">
							Reactivate Item
						</button>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget>
				<template #header>
					<h2 class="ve-widget-title">General Specifications</h2>
				</template>

				<form v-if="editing" class="ve-form-grid" @submit.prevent="saveEdit">
					<div class="ve-field" style="grid-column: 1 / -1">
						<label class="ve-field-label">Item Name</label>
						<input
							v-model="editForm.item_name"
							class="ve-field-input"
							type="text"
							required
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Category</label>
						<select v-model="editForm.category" class="ve-field-input">
							<option v-for="cat in CATEGORIES" :key="cat" :value="cat">
								{{ cat }}
							</option>
						</select>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Unit</label>
						<input v-model="editForm.unit" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Per-School Qty Norm</label>
						<input
							v-model="editForm.school_norm_qty"
							class="ve-field-input"
							type="number"
							min="0"
							step="0.01"
						/>
					</div>
					<div class="ve-form-actions" style="grid-column: 1 / -1">
						<button
							type="submit"
							class="ve-button ve-button--primary"
							:disabled="saving"
						>
							{{ saving ? "Saving..." : "Save" }}
						</button>
						<button type="button" class="ve-outline-button" @click="cancelEdit">
							Cancel
						</button>
					</div>
				</form>

				<div v-else class="ve-detail-grid">
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Item ID</span>
						<span class="ve-detail-field-value ve-detail-field-value--disabled">{{
							item.id
						}}</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Per-School Qty Norm</span>
						<span class="ve-detail-field-value">{{ item.norm }}</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Item Name</span>
						<span class="ve-detail-field-value">{{ item.name }}</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Category</span>
						<span class="ve-detail-field-value">{{ item.category }}</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Unit</span>
						<span class="ve-detail-field-value">{{ item.unit }}</span>
					</div>
				</div>
			</BaseWidget>
		</template>
	</div>
</template>
