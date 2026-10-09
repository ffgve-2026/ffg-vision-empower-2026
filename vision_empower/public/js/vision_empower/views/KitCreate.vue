<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { getList } from "../utils/api";

const router = useRouter();
const submitting = ref(false);
const loadingOptions = ref(false);

const items = ref([]);
const vendors = ref([]);

// Kit.kit_items is a required child table — a Kit can't be saved without
// at least one row, so the form starts with one blank row.
const emptyRow = () => ({ item: "", quantity: 1, uom: "" });

const form = ref({
	kit_name: "",
	kit_code: "",
	description: "",
	preferred_vendor: "",
	target_school_type: "",
	kit_items: [emptyRow()],
});

async function loadOptions() {
	loadingOptions.value = true;

	try {
		const [itemRows, vendorRows] = await Promise.all([
			getList("Item", ["name", "item_name", "unit"], { active: 1 }, "item_name asc"),
			getList("Vendor", ["name", "vendor_name"], { active: 1 }, "vendor_name asc"),
		]);
		items.value = itemRows;
		vendors.value = vendorRows;
	} catch (error) {
		console.error("Failed to load Item/Vendor options:", error);
		showToast({ message: "Could not load Item/Vendor options.", variant: "danger" });
	} finally {
		loadingOptions.value = false;
	}
}

onMounted(loadOptions);

function addRow() {
	form.value.kit_items.push(emptyRow());
}

function removeRow(index) {
	form.value.kit_items.splice(index, 1);
	if (!form.value.kit_items.length) form.value.kit_items.push(emptyRow());
}

// Default the row's UOM to the item's own unit, so the common case needs
// no extra typing.
function onItemChange(row) {
	if (row.uom) return;
	row.uom = items.value.find((i) => i.name === row.item)?.unit || "";
}

async function submit() {
	const rows = form.value.kit_items.filter((r) => r.item);

	if (!rows.length) {
		showToast({ message: "Add at least one item to this kit.", variant: "danger" });
		return;
	}

	submitting.value = true;

	try {
		const response = await frappe.call({
			method: "frappe.client.insert",
			args: {
				doc: {
					doctype: "Kit",
					kit_name: form.value.kit_name,
					kit_code: form.value.kit_code,
					description: form.value.description,
					preferred_vendor: form.value.preferred_vendor || undefined,
					target_school_type: form.value.target_school_type || undefined,
					active: 1,
					kit_items: rows.map((r) => ({
						doctype: "Kit Item",
						item: r.item,
						quantity: Number(r.quantity) || 0,
						uom: r.uom,
					})),
				},
			},
		});

		const kit = response.message;

		showToast({ message: `${kit.kit_name} added to the Kit Master.`, variant: "success" });
		router.push({ name: "kit-detail", params: { kitId: kit.name } });
	} catch (err) {
		console.error("Failed to create kit:", err);
		showToast({ message: "Failed to create kit.", variant: "error" });
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>New Kit</h2>
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Kit Definition</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="submit">
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Kit Name</label>
					<input v-model="form.kit_name" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Kit Code</label>
					<input
						v-model="form.kit_code"
						class="ve-field-input"
						type="text"
						placeholder="e.g. CT-PRIMARY-01"
						required
					/>
				</div>
				<div class="ve-field">
					<label class="ve-field-label"
						>Target School Type
						<span class="ve-field-optional">(optional)</span></label
					>
					<select v-model="form.target_school_type" class="ve-field-input">
						<option value="">None</option>
						<option>Govt</option>
						<option>Private</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label"
						>Preferred Vendor <span class="ve-field-optional">(optional)</span></label
					>
					<select
						v-model="form.preferred_vendor"
						class="ve-field-input"
						:disabled="loadingOptions"
					>
						<option value="">None</option>
						<option v-for="v in vendors" :key="v.name" :value="v.name">
							{{ v.vendor_name }}
						</option>
					</select>
				</div>
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Description</label>
					<input v-model="form.description" class="ve-field-input" type="text" />
				</div>

				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Kit Items</label>
					<div class="ve-table-wrapper">
						<table class="ve-data-table">
							<thead>
								<tr>
									<th style="width: 45%">Item</th>
									<th style="width: 20%">Quantity</th>
									<th style="width: 25%">UOM</th>
									<th style="width: 10%"></th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="(row, index) in form.kit_items" :key="index">
									<td>
										<select
											v-model="row.item"
											class="ve-field-input"
											:disabled="loadingOptions"
											@change="onItemChange(row)"
										>
											<option value="">Select item</option>
											<option
												v-for="i in items"
												:key="i.name"
												:value="i.name"
											>
												{{ i.item_name }}
											</option>
										</select>
									</td>
									<td>
										<input
											v-model="row.quantity"
											class="ve-field-input"
											type="number"
											min="1"
											step="any"
										/>
									</td>
									<td>
										<input
											v-model="row.uom"
											class="ve-field-input"
											type="text"
											placeholder="e.g. Nos"
										/>
									</td>
									<td>
										<button
											type="button"
											class="ve-link-button ve-link-button--danger"
											@click="removeRow(index)"
										>
											Remove
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div style="margin-top: 0.5rem">
						<button type="button" class="ve-outline-button" @click="addRow">
							+ Add Item
						</button>
					</div>
					<p class="ve-field-hint" style="margin-top: 0.375rem">
						A kit needs at least one item. Rows with no item selected are ignored.
					</p>
				</div>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button
						type="submit"
						class="ve-button ve-button--primary"
						:disabled="submitting"
					>
						{{ submitting ? "Saving..." : "Save Kit" }}
					</button>
					<button
						type="button"
						class="ve-outline-button"
						@click="router.push({ name: 'kits' })"
					>
						Cancel
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>
