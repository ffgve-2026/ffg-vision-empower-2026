<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { KITS, KIT_ITEMS, CATEGORY_BADGE, formatInr } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();
const canManage = userHasAnyRole([ROLES.ADMIN]);

const kit = computed(() => KITS.find((k) => k.id === route.params.kitId) || KITS[0]);
const items = computed(() => KIT_ITEMS[kit.value.id] || []);
const totalValue = computed(() => items.value.reduce((sum, i) => sum + i.price * i.qty, 0));

function editDetails() {
	showToast({ message: "Editing isn't wired up yet.", variant: "warning" });
}

function deleteKit() {
	showToast({ message: "Deletion isn't wired up yet.", variant: "warning" });
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
					<h2 class="ve-widget-title">{{ kit.name }}</h2>
					<span class="ve-badge" :class="`ve-badge--${CATEGORY_BADGE[kit.schoolType]}`">
						{{ kit.schoolType }}
					</span>
				</div>
				<div v-if="canManage" class="ve-detail-actions">
					<button class="ve-link-button" @click="editDetails">Edit Details</button>
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

			<div class="ve-detail-grid">
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Kit ID</span>
					<span class="ve-detail-field-value ve-detail-field-value--disabled">{{ kit.id }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Preferred Vendor</span>
					<span class="ve-detail-field-value">{{ kit.vendor }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Kit Name</span>
					<span class="ve-detail-field-value">{{ kit.name }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Target School Type</span>
					<span class="ve-detail-field-value">{{ kit.schoolType }}</span>
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
							<th>Unit Price</th>
							<th>Line Total</th>
							<th>Preferred Vendor</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="i in items" :key="i.id">
							<td @click="openItem(i.id)"><span class="ve-link">{{ i.id }}</span></td>
							<td @click="openItem(i.id)">{{ i.name }}</td>
							<td>{{ i.unit }}</td>
							<td>{{ i.qty }}</td>
							<td>{{ formatInr(i.price) }}</td>
							<td>{{ formatInr(i.price * i.qty) }}</td>
							<td><span class="ve-link">{{ i.vendor }}</span></td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-footer-total">
				<span class="ve-subtitle">Total Calculated Kit Price</span>
				<span class="ve-footer-total-value">{{ formatInr(totalValue) }}</span>
			</div>
		</BaseWidget>
	</div>
</template>
