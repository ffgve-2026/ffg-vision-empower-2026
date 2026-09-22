<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { VENDORS, CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();
const search = ref("");
const canManage = userHasAnyRole([ROLES.ADMIN]);

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return VENDORS;
	return VENDORS.filter(
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
			<div class="ve-toolbar">
				<input
					v-model="search"
					class="ve-toolbar-search"
					type="text"
					placeholder="Search vendors by name, GST..."
				/>
				<div class="ve-toolbar-spacer" />
				<button v-if="canManage" class="ve-button ve-button--primary" @click="newVendor">
					New Vendor
				</button>
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
						<tr v-for="vendor in filtered" :key="vendor.id" @click="openVendor(vendor)">
							<td><span class="ve-link">{{ vendor.id }}</span></td>
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
				Showing {{ filtered.length }} of {{ VENDORS.length }} vendors
			</div>
		</BaseWidget>
	</div>
</template>
