<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { SCHOOLS, CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();
const search = ref("");
const stateFilter = ref("");
const typeFilter = ref("");
const canManage = userHasAnyRole([ROLES.ADMIN]);

const states = computed(() => [...new Set(SCHOOLS.map((s) => s.state))].sort());

const filtered = computed(() =>
	SCHOOLS.filter((s) => {
		const term = search.value.trim().toLowerCase();
		const matchesSearch = !term || s.name.toLowerCase().includes(term);
		const matchesState = !stateFilter.value || s.state === stateFilter.value;
		const matchesType = !typeFilter.value || s.type === typeFilter.value;
		return matchesSearch && matchesState && matchesType;
	})
);

function openSchool(school) {
	router.push({ name: "school-detail", params: { schoolId: school.id } });
}

function newSchool() {
	router.push({ name: "school-create" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>School Master</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<select v-model="stateFilter" class="ve-field-input" style="max-width: 180px">
					<option value="">State: All States</option>
					<option v-for="s in states" :key="s" :value="s">{{ s }}</option>
				</select>
				<select v-model="typeFilter" class="ve-field-input" style="max-width: 160px">
					<option value="">Type: All Types</option>
					<option value="Govt">Govt</option>
					<option value="Private">Private</option>
				</select>
				<input v-model="search" class="ve-toolbar-search" type="text" placeholder="Search schools..." />
				<div class="ve-toolbar-spacer" />
				<button v-if="canManage" class="ve-button ve-button--primary" @click="newSchool">
					New School
				</button>
			</div>

			<div class="ve-table-wrapper" style="margin-top: 1rem">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>School ID</th>
							<th>School Name</th>
							<th>State</th>
							<th>District</th>
							<th>Contact Person</th>
							<th>Phone</th>
							<th>Type</th>
							<th>Capacity</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="school in filtered" :key="school.id" @click="openSchool(school)">
							<td><span class="ve-link">{{ school.id }}</span></td>
							<td>{{ school.name }}</td>
							<td>{{ school.state }}</td>
							<td>{{ school.district }}</td>
							<td>{{ school.contact }}</td>
							<td>{{ school.phone }}</td>
							<td>
								<span class="ve-badge" :class="`ve-badge--${CATEGORY_BADGE[school.type]}`">
									{{ school.type }}
								</span>
							</td>
							<td>{{ school.capacity }} Students</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-pagination-note">
				Showing {{ filtered.length }} of {{ SCHOOLS.length }} schools
			</div>
		</BaseWidget>
	</div>
</template>
