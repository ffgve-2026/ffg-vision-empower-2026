<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ITEMS, CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();
const search = ref("");
const categoryFilter = ref("");
const selected = ref([]);
const canManage = userHasAnyRole([ROLES.ADMIN]);

const categories = computed(() => [...new Set(ITEMS.map((i) => i.category))].sort());

const filtered = computed(() =>
	ITEMS.filter((i) => {
		const term = search.value.trim().toLowerCase();
		const matchesSearch = !term || i.name.toLowerCase().includes(term) || i.id.toLowerCase().includes(term);
		const matchesCategory = !categoryFilter.value || i.category === categoryFilter.value;
		return matchesSearch && matchesCategory;
	})
);

function toggleSelect(id) {
	const index = selected.value.indexOf(id);
	if (index === -1) selected.value.push(id);
	else selected.value.splice(index, 1);
}

function openItem(item) {
	router.push({ name: "item-detail", params: { itemId: item.id } });
}

function newItem() {
	showToast({ message: "Item creation isn't wired up yet.", variant: "warning" });
}

function generateCsv() {
	showToast({ message: "CSV export isn't wired up yet.", variant: "warning" });
}

function createDc() {
	showToast({ message: "DC creation isn't wired up yet.", variant: "warning" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Item Master</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<input
					v-model="search"
					class="ve-toolbar-search"
					type="text"
					placeholder="Search items by name, ID..."
				/>
				<select v-model="categoryFilter" class="ve-field-input" style="max-width: 180px">
					<option value="">Category: All Categories</option>
					<option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
				</select>
				<div class="ve-toolbar-spacer" />
				<button v-if="canManage" class="ve-button ve-button--primary" @click="newItem">
					New Item
				</button>
			</div>

			<div v-if="canManage" class="ve-toolbar" style="margin-top: 0.75rem">
				<span class="ve-subtitle">{{ selected.length }} items selected</span>
				<div class="ve-toolbar-spacer" />
				<button class="ve-outline-button" @click="generateCsv">Generate CSV</button>
				<button class="ve-button ve-button--primary" @click="createDc">Create DC</button>
			</div>

			<div class="ve-table-wrapper" style="margin-top: 1rem">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th v-if="canManage"></th>
							<th>Item ID</th>
							<th>Item Name</th>
							<th>Category</th>
							<th>Unit</th>
							<th>Linked Vendor(s)</th>
							<th>School Norm Qty</th>
							<th>Unit Price</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in filtered" :key="item.id">
							<td v-if="canManage" @click.stop>
								<input
									type="checkbox"
									:checked="selected.includes(item.id)"
									@change="toggleSelect(item.id)"
								/>
							</td>
							<td @click="openItem(item)"><span class="ve-link">{{ item.id }}</span></td>
							<td @click="openItem(item)">{{ item.name }}</td>
							<td @click="openItem(item)">
								<span class="ve-badge" :class="`ve-badge--${CATEGORY_BADGE[item.category] || 'gray'}`">
									{{ item.category }}
								</span>
							</td>
							<td @click="openItem(item)">{{ item.unit }}</td>
							<td @click="openItem(item)">{{ item.vendor }}</td>
							<td @click="openItem(item)">{{ item.norm }}</td>
							<td @click="openItem(item)">{{ item.price }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-pagination-note">
				Showing {{ filtered.length }} of {{ ITEMS.length }} items
			</div>
		</BaseWidget>
	</div>
</template>
