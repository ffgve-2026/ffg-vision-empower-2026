<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import ImportCsvButton from "../components/ImportCsvButton.vue";
import { showToast } from "../components/toast/useToast";
import { ROLES, userHasAnyRole } from "../config/roles";
import { callApi, getList, formatInr, formatDate } from "../utils/api";

const router = useRouter();

// Client-side only — save/delete_vendor_item_price re-check the role.
const canManage = userHasAnyRole([ROLES.ADMIN]);

const vendors = ref([]);
const items = ref([]);
const prices = ref([]);
const loading = ref(true);
const vendorFilter = ref("");
const itemFilter = ref("");

const today = new Date().toISOString().split("T")[0];
const emptyForm = () => ({
	name: "",
	vendor: "",
	item: "",
	unitPrice: "",
	gstRate: "",
	effectiveDate: today,
	kitQty: "",
});
const form = ref(emptyForm());
const saving = ref(false);
const editing = computed(() => Boolean(form.value.name));

async function load() {
	loading.value = true;
	try {
		prices.value = await callApi("list_vendor_item_prices", {
			vendor: vendorFilter.value,
			item: itemFilter.value,
		});
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	load();
	[vendors.value, items.value] = await Promise.all([
		getList("Vendor", ["name", "vendor_name"], {}, "vendor_name asc"),
		getList("Item", ["name", "item_name"], {}, "item_name asc"),
	]);
});
watch([vendorFilter, itemFilter], load);

function editPrice(row) {
	form.value = {
		name: row.name,
		vendor: row.vendor,
		item: row.item,
		unitPrice: row.unit_price,
		gstRate: row.gst_rate,
		effectiveDate: row.effective_date,
		kitQty: row.kit_qty,
	};
}

async function save() {
	saving.value = true;
	try {
		const result = await callApi("save_vendor_item_price", {
			name: form.value.name,
			vendor: form.value.vendor,
			item: form.value.item,
			unit_price: form.value.unitPrice,
			gst_rate: form.value.gstRate,
			effective_date: form.value.effectiveDate,
			kit_qty: form.value.kitQty,
		});
		showToast({ message: result.message, variant: "success" });
		form.value = emptyForm();
		await load();
	} catch (error) {
		showToast({ message: "Could not save the price.", variant: "danger" });
		throw error;
	} finally {
		saving.value = false;
	}
}

async function removePrice(row) {
	try {
		const result = await callApi("delete_vendor_item_price", { name: row.name });
		showToast({ message: result.message, variant: "success" });
		if (form.value.name === row.name) form.value = emptyForm();
		await load();
	} catch (error) {
		showToast({ message: "Could not delete the price.", variant: "danger" });
		throw error;
	}
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Vendor Prices</h2>
			<p class="ve-subtitle">
				Unit prices per vendor and item. The latest effective price feeds requisition
				estimates and purchase order lines.
			</p>
		</div>

		<BaseWidget v-if="canManage">
			<template #header>
				<h2 class="ve-widget-title">{{ editing ? "Edit Price" : "Add Price" }}</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="save">
				<div class="ve-field">
					<label class="ve-field-label">Vendor</label>
					<select v-model="form.vendor" class="ve-field-input" required>
						<option value="" disabled>Select vendor</option>
						<option v-for="v in vendors" :key="v.name" :value="v.name">
							{{ v.vendor_name }}
						</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Item</label>
					<select v-model="form.item" class="ve-field-input" required>
						<option value="" disabled>Select item</option>
						<option v-for="i in items" :key="i.name" :value="i.name">
							{{ i.item_name }}
						</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Unit Price (₹)</label>
					<input
						v-model="form.unitPrice"
						class="ve-field-input"
						type="number"
						min="0"
						step="0.01"
						required
					/>
				</div>
				<div class="ve-field">
					<label class="ve-field-label"
						>GST % <span class="ve-field-optional">(optional)</span></label
					>
					<input
						v-model="form.gstRate"
						class="ve-field-input"
						type="number"
						min="0"
						step="0.01"
					/>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Effective Date</label>
					<input
						v-model="form.effectiveDate"
						class="ve-field-input"
						type="date"
						required
					/>
				</div>
				<div class="ve-field">
					<label class="ve-field-label"
						>Kit Qty <span class="ve-field-optional">(optional)</span></label
					>
					<input v-model="form.kitQty" class="ve-field-input" type="number" min="0" />
				</div>
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
						{{ saving ? "Saving..." : editing ? "Update Price" : "Add Price" }}
					</button>
				</div>
			</form>
		</BaseWidget>

		<BaseWidget>
			<div class="ve-toolbar">
				<select v-model="vendorFilter" class="ve-field-input" style="max-width: 200px">
					<option value="">All Vendors</option>
					<option v-for="v in vendors" :key="v.name" :value="v.name">
						{{ v.vendor_name }}
					</option>
				</select>
				<select v-model="itemFilter" class="ve-field-input" style="max-width: 200px">
					<option value="">All Items</option>
					<option v-for="i in items" :key="i.name" :value="i.name">
						{{ i.item_name }}
					</option>
				</select>
				<div class="ve-toolbar-spacer" />
				<ImportCsvButton v-if="canManage" doctype="Vendor Item Price" @imported="load" />
			</div>

			<div class="ve-table-wrapper" style="margin-top: 1rem">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Vendor</th>
							<th>Item</th>
							<th>Unit Price</th>
							<th>GST %</th>
							<th>Effective Date</th>
							<th v-if="canManage"></th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in prices" :key="row.name">
							<td
								@click="
									router.push({
										name: 'vendor-detail',
										params: { vendorId: row.vendor },
									})
								"
							>
								<span class="ve-link">{{ row.vendor_name }}</span>
							</td>
							<td
								@click="
									router.push({
										name: 'item-detail',
										params: { itemId: row.item },
									})
								"
							>
								<span class="ve-link">{{ row.item_name }}</span>
							</td>
							<td>{{ formatInr(row.unit_price) }}</td>
							<td>{{ row.gst_rate || 0 }}%</td>
							<td>{{ formatDate(row.effective_date) }}</td>
							<td v-if="canManage">
								<button class="ve-link-button" @click="editPrice(row)">
									Edit
								</button>
								<button
									class="ve-link-button ve-link-button--danger"
									@click="removePrice(row)"
								>
									Delete
								</button>
							</td>
						</tr>
						<tr v-if="!loading && !prices.length">
							<td :colspan="canManage ? 6 : 5" class="ve-table-secondary">
								No prices recorded yet.
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
