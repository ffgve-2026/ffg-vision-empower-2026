<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ITEMS, ITEM_VENDOR_HISTORY, CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();
const canManage = userHasAnyRole([ROLES.ADMIN]);

const item = computed(() => ITEMS.find((i) => i.id === route.params.itemId) || ITEMS[0]);
const vendorHistory = computed(() => ITEM_VENDOR_HISTORY[item.value.id] || []);

function editDetails() {
	showToast({ message: "Editing isn't wired up yet.", variant: "warning" });
}

function discontinueItem() {
	showToast({ message: "Discontinuing isn't wired up yet.", variant: "warning" });
}

function openVendor(vendorId) {
	router.push({ name: "vendor-detail", params: { vendorId } });
}
</script>

<template>
	<div class="ve-view">
		<BaseWidget>
			<div class="ve-detail-header">
				<div class="ve-detail-header-left">
					<h2 class="ve-widget-title">{{ item.name }}</h2>
					<span class="ve-badge" :class="`ve-badge--${CATEGORY_BADGE[item.category] || 'gray'}`">
						{{ item.category }}
					</span>
				</div>
				<div v-if="canManage" class="ve-detail-actions">
					<button class="ve-link-button" @click="editDetails">Edit Details</button>
					<button class="ve-outline-button ve-outline-button--danger" @click="discontinueItem">
						Discontinue Item
					</button>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">General Specifications</h2>
			</template>

			<div class="ve-detail-grid">
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Item ID</span>
					<span class="ve-detail-field-value ve-detail-field-value--disabled">{{ item.id }}</span>
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
					<span class="ve-detail-field-label">Unit Price (INR)</span>
					<span class="ve-detail-field-value">{{ item.price }}</span>
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

		<BaseWidget v-if="vendorHistory.length > 0">
			<template #header>
				<h2 class="ve-widget-title">Associated Vendors & Supply Price History</h2>
			</template>

			<div class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Vendor ID</th>
							<th>Vendor Name</th>
							<th>Location</th>
							<th>Last Quoted Price</th>
							<th>Last PO Date</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="v in vendorHistory" :key="v.id" @click="openVendor(v.id)">
							<td><span class="ve-link">{{ v.id }}</span></td>
							<td><span class="ve-link">{{ v.name }}</span></td>
							<td>{{ v.location }}</td>
							<td>{{ v.price }}</td>
							<td>{{ v.date }}</td>
							<td>
								<span v-if="v.status" class="ve-badge ve-badge--teal">{{ v.status }}</span>
								<span v-else class="ve-subtitle">{{ v.confidence }}</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
