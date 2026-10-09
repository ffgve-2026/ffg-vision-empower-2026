<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import ImportCsvButton from "../components/ImportCsvButton.vue";
import { CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();
const search = ref("");
const vendors = ref([]);
const loading = ref(false);
const error = ref("");
const canManage = userHasAnyRole([ROLES.ADMIN]);

async function loadVendors() {
	loading.value = true;
	error.value = "";

	try {
		const response = await frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Vendor",
				fields: [
					"name",
					"vendor_name",
					"category",
					"contact_person",
					"phone",
					"gstin",
					"active",
				],
				order_by: "creation desc",
				limit_page_length: 100,
			},
		});

		vendors.value = (response.message || []).map((vendor) => ({
			id: vendor.name,
			name: vendor.vendor_name,
			contact: vendor.contact_person || "-",
			phone: vendor.phone || "-",
			categories: vendor.category ? vendor.category.split(",").map((cat) => cat.trim()) : [],
			gst: vendor.gstin || "-",
			status: vendor.active ? "Active" : "Inactive",
		}));
	} catch (err) {
		console.error("Failed to load vendors:", err);
		error.value = "Failed to load vendors.";
	} finally {
		loading.value = false;
	}
}

onMounted(loadVendors);

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();

	if (!term) return vendors.value;

	return vendors.value.filter(
		(v) => v.name.toLowerCase().includes(term) || v.gst.toLowerCase().includes(term)
	);
});

function openVendor(vendor) {
	router.push({ name: "vendor-detail", params: { vendorId: vendor.id } });
}

function newVendor() {
	router.push({ name: "vendor-create" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Vendor Master</h2>
		</div>

		<BaseWidget>
			<div v-if="loading" class="ve-pagination-note">Loading vendors...</div>

			<div v-else-if="error" class="ve-pagination-note">
				{{ error }}
			</div>
			<div class="ve-toolbar">
				<input
					v-model="search"
					class="ve-toolbar-search"
					type="text"
					placeholder="Search vendors by name, GST..."
				/>
				<div class="ve-toolbar-spacer" />
				<!-- Wraps as one group, right-aligned, when the row is full. -->
				<div class="ve-toolbar-actions">
					<ImportCsvButton v-if="canManage" doctype="Vendor" @imported="loadVendors" />
					<button
						v-if="canManage"
						class="ve-button ve-button--primary"
						@click="newVendor"
					>
						New Vendor
					</button>
				</div>
			</div>

			<div class="ve-table-wrapper" style="margin-top: 1rem">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Vendor ID</th>
							<th>Vendor Name</th>
							<th>Contact Person</th>
							<th>Phone</th>
							<th>Category</th>
							<th>GST No.</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="vendor in filtered"
							:key="vendor.id"
							@click="openVendor(vendor)"
						>
							<td>
								<span class="ve-link">{{ vendor.id }}</span>
							</td>
							<td>{{ vendor.name }}</td>
							<td>{{ vendor.contact }}</td>
							<td>{{ vendor.phone }}</td>
							<td>
								<span
									v-for="cat in vendor.categories"
									:key="cat"
									class="ve-badge"
									:class="`ve-badge--${CATEGORY_BADGE[cat] || 'gray'}`"
									style="margin-right: 0.25rem"
								>
									{{ cat }}
								</span>
							</td>
							<td>{{ vendor.gst }}</td>
							<td>
								<span
									class="ve-status-text"
									:class="`ve-status-text--${vendor.status.toLowerCase()}`"
								>
									{{ vendor.status }}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-pagination-note">
				Showing {{ filtered.length }} of {{ vendors.length }} vendors
			</div>
		</BaseWidget>
	</div>
</template>
