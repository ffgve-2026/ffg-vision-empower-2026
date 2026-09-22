<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { VENDORS, VENDOR_ITEMS, CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();
const canManage = userHasAnyRole([ROLES.ADMIN]);

const vendor = computed(() => VENDORS.find((v) => v.id === route.params.vendorId) || VENDORS[0]);
const items = computed(() => VENDOR_ITEMS[vendor.value.id] || []);

function editDetails() {
	showToast({ message: "Editing isn't wired up yet.", variant: "warning" });
}

function deactivateVendor() {
	showToast({ message: "Deactivation isn't wired up yet.", variant: "warning" });
}

function openItem(itemId) {
	router.push({ name: "item-detail", params: { itemId } });
}
</script>

<template>
	<div class="ve-view">
		<BaseWidget>
			<div class="ve-detail-header">
				<div class="ve-detail-header-left">
					<h2 class="ve-widget-title">{{ vendor.name }}</h2>
					<span class="ve-status-text" :class="`ve-status-text--${vendor.status.toLowerCase()}`">
						{{ vendor.status }}
					</span>
				</div>
				<div v-if="canManage" class="ve-detail-actions">
					<button class="ve-link-button" @click="editDetails">Edit Details</button>
					<button class="ve-outline-button ve-outline-button--danger" @click="deactivateVendor">
						Deactivate Vendor
					</button>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">General Information</h2>
			</template>

			<div class="ve-detail-grid">
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Vendor ID</span>
					<span class="ve-detail-field-value ve-detail-field-value--disabled">{{ vendor.id }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Address</span>
					<span class="ve-detail-field-value">{{ vendor.address }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Vendor Name</span>
					<span class="ve-detail-field-value">{{ vendor.name }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">City</span>
					<span class="ve-detail-field-value">{{ vendor.city }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Contact Person</span>
					<span class="ve-detail-field-value">{{ vendor.contact }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">State</span>
					<span class="ve-detail-field-value">{{ vendor.state }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Phone Number</span>
					<span class="ve-detail-field-value">{{ vendor.phone }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">GST Number</span>
					<span class="ve-detail-field-value">{{ vendor.gst }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Email Address</span>
					<span class="ve-detail-field-value">{{ vendor.email }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">PAN Number</span>
					<span class="ve-detail-field-value">{{ vendor.pan }}</span>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Bank & Settlement Details</h2>
			</template>

			<div class="ve-detail-grid">
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Bank Name</span>
					<span class="ve-detail-field-value">{{ vendor.bank }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Account Number</span>
					<span class="ve-detail-field-value">{{ vendor.account }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">IFSC Code</span>
					<span class="ve-detail-field-value">{{ vendor.ifsc }}</span>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Classifications</h2>
			</template>

			<div class="ve-detail-field">
				<span class="ve-detail-field-label">Assigned Categories</span>
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

		<BaseWidget v-if="items.length > 0">
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
							<td><span class="ve-link">{{ item.id }}</span></td>
							<td>{{ item.name }}</td>
							<td>{{ item.price }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
