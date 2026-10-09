<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { CATEGORY_BADGE } from "../config/masterDataMock";
import { callApi, formatInr } from "../utils/api";
import { ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();

const canManage = userHasAnyRole([ROLES.ADMIN]);

const vendor = ref({
	id: "",
	name: "",
	contact: "-",
	phone: "-",
	email: "-",
	address: "-",
	city: "-",
	state: "-",
	gst: "-",
	pan: "-",
	bank: "-",
	account: "-",
	ifsc: "-",
	categories: [],
	status: "Inactive",
});

const items = ref([]);
const loading = ref(false);
const error = ref("");

const editing = ref(false);
const editForm = ref({});
const saving = ref(false);

async function loadVendor() {
	loading.value = true;
	error.value = "";

	try {
		const response = await frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Vendor",
				name: route.params.vendorId,
			},
		});

		const data = response.message;

		if (!data) {
			throw new Error("Vendor not found");
		}

		vendor.value = {
			id: data.name,
			name: data.vendor_name,
			contact: data.contact_person || "-",
			phone: data.phone || "-",
			email: data.email || "-",
			address: data.address || "-",
			city: data.city || "-",
			state: data.state || "-",
			gst: data.gstin || "-",
			pan: data.pan || "-",
			bank: data.bank_name || "-",
			account: data.bank_account_number || "-",
			ifsc: data.ifsc_code || "-",
			categories: data.category ? data.category.split(",").map((cat) => cat.trim()) : [],
			status: data.active ? "Active" : "Inactive",
		};
	} catch (err) {
		console.error("Failed to load vendor:", err);
		error.value = "Failed to load vendor.";
	} finally {
		loading.value = false;
	}
}

async function loadPrices() {
	// Latest effective price per item for this vendor.
	const rows = await callApi("list_vendor_item_prices", { vendor: route.params.vendorId });
	const latest = new Map();
	for (const row of rows) if (!latest.has(row.item)) latest.set(row.item, row);
	items.value = [...latest.values()].map((row) => ({
		id: row.item,
		name: row.item_name,
		price: formatInr(row.unit_price),
	}));
}

onMounted(() => {
	loadVendor();
	loadPrices();
});

function startEdit() {
	editForm.value = {
		vendor_name: vendor.value.name,
		contact_person: vendor.value.contact === "-" ? "" : vendor.value.contact,
		phone: vendor.value.phone === "-" ? "" : vendor.value.phone,
		email: vendor.value.email === "-" ? "" : vendor.value.email,
		address: vendor.value.address === "-" ? "" : vendor.value.address,
		city: vendor.value.city === "-" ? "" : vendor.value.city,
		state: vendor.value.state === "-" ? "" : vendor.value.state,
		gstin: vendor.value.gst === "-" ? "" : vendor.value.gst,
		pan: vendor.value.pan === "-" ? "" : vendor.value.pan,
		bank_name: vendor.value.bank === "-" ? "" : vendor.value.bank,
		bank_account_number: vendor.value.account === "-" ? "" : vendor.value.account,
		ifsc_code: vendor.value.ifsc === "-" ? "" : vendor.value.ifsc,
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
				doctype: "Vendor",
				name: vendor.value.id,
				fieldname: {
					...editForm.value,
				},
			},
		});

		showToast({ message: "Vendor updated.", variant: "success" });
		editing.value = false;
		await loadVendor();
	} catch (err) {
		console.error("Failed to update vendor:", err);
		showToast({ message: "Failed to update vendor.", variant: "error" });
	} finally {
		saving.value = false;
	}
}

async function deactivateVendor() {
	if (!window.confirm(`Deactivate vendor "${vendor.value.name}"?`)) return;

	try {
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "Vendor",
				name: vendor.value.id,
				fieldname: "active",
				value: 0,
			},
		});

		showToast({ message: "Vendor deactivated.", variant: "success" });
		await loadVendor();
	} catch (err) {
		console.error("Failed to deactivate vendor:", err);
		showToast({ message: "Failed to deactivate vendor.", variant: "error" });
	}
}

function openItem(itemId) {
	router.push({
		name: "item-detail",
		params: { itemId },
	});
}
</script>

<template>
	<div class="ve-view">
		<div v-if="loading" class="ve-pagination-note">Loading vendor...</div>

		<div v-else-if="error" class="ve-pagination-note">
			{{ error }}
		</div>

		<template v-else>
			<BaseWidget>
				<div class="ve-detail-header">
					<div class="ve-detail-header-left">
						<h2 class="ve-widget-title">{{ vendor.name }}</h2>

						<span
							class="ve-status-text"
							:class="`ve-status-text--${vendor.status.toLowerCase()}`"
						>
							{{ vendor.status }}
						</span>
					</div>

					<div v-if="canManage && !editing" class="ve-detail-actions">
						<button class="ve-link-button" @click="startEdit">Edit Details</button>

						<button
							class="ve-outline-button ve-outline-button--danger"
							@click="deactivateVendor"
						>
							Deactivate Vendor
						</button>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget>
				<template #header>
					<h2 class="ve-widget-title">General Information</h2>
				</template>

				<form v-if="editing" class="ve-form-grid" @submit.prevent="saveEdit">
					<div class="ve-field">
						<label class="ve-field-label">Vendor Name</label>
						<input
							v-model="editForm.vendor_name"
							class="ve-field-input"
							type="text"
							required
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Contact Person</label>
						<input
							v-model="editForm.contact_person"
							class="ve-field-input"
							type="text"
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Phone Number</label>
						<input v-model="editForm.phone" class="ve-field-input" type="tel" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Email Address</label>
						<input v-model="editForm.email" class="ve-field-input" type="email" />
					</div>
					<div class="ve-field" style="grid-column: 1 / -1">
						<label class="ve-field-label">Address</label>
						<input v-model="editForm.address" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">City</label>
						<input v-model="editForm.city" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">State</label>
						<input v-model="editForm.state" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">GST Number</label>
						<input v-model="editForm.gstin" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">PAN Number</label>
						<input v-model="editForm.pan" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Bank Name</label>
						<input v-model="editForm.bank_name" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Account Number</label>
						<input
							v-model="editForm.bank_account_number"
							class="ve-field-input"
							type="text"
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">IFSC Code</label>
						<input v-model="editForm.ifsc_code" class="ve-field-input" type="text" />
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
						<span class="ve-detail-field-label"> Vendor ID </span>

						<span class="ve-detail-field-value ve-detail-field-value--disabled">
							{{ vendor.id }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> Address </span>

						<span class="ve-detail-field-value">
							{{ vendor.address }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> Vendor Name </span>

						<span class="ve-detail-field-value">
							{{ vendor.name }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> City </span>

						<span class="ve-detail-field-value">
							{{ vendor.city }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> Contact Person </span>

						<span class="ve-detail-field-value">
							{{ vendor.contact }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> State </span>

						<span class="ve-detail-field-value">
							{{ vendor.state }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> Phone Number </span>

						<span class="ve-detail-field-value">
							{{ vendor.phone }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> GST Number </span>

						<span class="ve-detail-field-value">
							{{ vendor.gst }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> Email Address </span>

						<span class="ve-detail-field-value">
							{{ vendor.email }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> PAN Number </span>

						<span class="ve-detail-field-value">
							{{ vendor.pan }}
						</span>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget v-if="!editing">
				<template #header>
					<h2 class="ve-widget-title">Bank & Settlement Details</h2>
				</template>

				<div class="ve-detail-grid">
					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> Bank Name </span>

						<span class="ve-detail-field-value">
							{{ vendor.bank }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> Account Number </span>

						<span class="ve-detail-field-value">
							{{ vendor.account }}
						</span>
					</div>

					<div class="ve-detail-field">
						<span class="ve-detail-field-label"> IFSC Code </span>

						<span class="ve-detail-field-value">
							{{ vendor.ifsc }}
						</span>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget v-if="!editing">
				<template #header>
					<h2 class="ve-widget-title">Classifications</h2>
				</template>

				<div class="ve-detail-field">
					<span class="ve-detail-field-label"> Assigned Categories </span>

					<div class="ve-tag-row" style="margin-top: 0.375rem">
						<span
							v-for="cat in vendor.categories"
							:key="cat"
							class="ve-badge"
							:class="`ve-badge--${CATEGORY_BADGE[cat] || 'gray'}`"
						>
							{{ cat }}
						</span>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget v-if="!editing && items.length > 0">
				<template #header>
					<h2 class="ve-widget-title">Associated Procurement Items</h2>
				</template>

				<div class="ve-table-wrapper">
					<table class="ve-data-table">
						<thead>
							<tr>
								<th>Item ID</th>
								<th>Item Name</th>
								<th>Contract Unit Price</th>
							</tr>
						</thead>

						<tbody>
							<tr v-for="item in items" :key="item.id" @click="openItem(item.id)">
								<td>
									<span class="ve-link">
										{{ item.id }}
									</span>
								</td>

								<td>
									{{ item.name }}
								</td>

								<td>
									{{ item.price }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</BaseWidget>
		</template>
	</div>
</template>
