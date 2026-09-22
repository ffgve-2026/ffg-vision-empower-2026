<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { KITS, CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();
const search = ref("");
const canManage = userHasAnyRole([ROLES.ADMIN]);

const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return KITS;
	return KITS.filter((k) => k.name.toLowerCase().includes(term) || k.id.toLowerCase().includes(term));
});

function openKit(kit) {
	router.push({ name: "kit-detail", params: { kitId: kit.id } });
}

function newKit() {
	router.push({ name: "kit-create" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Kit Master</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<input
					v-model="search"
					class="ve-toolbar-search"
					type="text"
					placeholder="Search kits by name, ID..."
				/>
				<div class="ve-toolbar-spacer" />
				<button v-if="canManage" class="ve-button ve-button--primary" @click="newKit">
					New Kit
				</button>
			</div>

			<div class="ve-table-wrapper" style="margin-top: 1rem">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>Kit ID</th>
							<th>Kit Name</th>
							<th>Items Count</th>
							<th>Preferred Vendor</th>
							<th>Target School Type</th>
							<th>Total Kit Value</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="kit in filtered" :key="kit.id" @click="openKit(kit)">
							<td><span class="ve-link">{{ kit.id }}</span></td>
							<td>{{ kit.name }}</td>
							<td>{{ kit.itemCount }} Items</td>
							<td>{{ kit.vendor }}</td>
							<td>
								<span class="ve-badge" :class="`ve-badge--${CATEGORY_BADGE[kit.schoolType]}`">
									{{ kit.schoolType }}
								</span>
							</td>
							<td>{{ kit.value }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-pagination-note">
				Showing {{ filtered.length }} of {{ KITS.length }} kits
			</div>
		</BaseWidget>
	</div>
</template>
