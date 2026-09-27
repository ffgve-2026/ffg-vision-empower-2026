<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { SCHOOLS, SCHOOL_DISPATCHES, CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const canManage = userHasAnyRole([ROLES.ADMIN]);

const school = computed(() => SCHOOLS.find((s) => s.id === route.params.schoolId) || SCHOOLS[0]);
const dispatches = computed(() => SCHOOL_DISPATCHES[school.value.id] || []);

function editDetails() {
	showToast({ message: "Editing isn't wired up yet.", variant: "warning" });
}

function deleteSchool() {
	showToast({ message: "Deletion isn't wired up yet.", variant: "warning" });
}
</script>

<template>
	<div class="ve-view">
		<BaseWidget>
			<div class="ve-detail-header">
				<div class="ve-detail-header-left">
					<h2 class="ve-widget-title">{{ school.name }}</h2>
					<span class="ve-badge" :class="`ve-badge--${CATEGORY_BADGE[school.type]}`">
						{{ school.type }}
					</span>
				</div>
				<div v-if="canManage" class="ve-detail-actions">
					<button class="ve-link-button" @click="editDetails">Edit Details</button>
					<button class="ve-outline-button ve-outline-button--danger" @click="deleteSchool">
						Delete School
					</button>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">School Profile Information</h2>
			</template>

			<div class="ve-detail-grid">
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">School ID</span>
					<span class="ve-detail-field-value ve-detail-field-value--disabled">{{ school.id }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Contact Person</span>
					<span class="ve-detail-field-value">{{ school.contact }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">School Name</span>
					<span class="ve-detail-field-value">{{ school.name }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Phone Number</span>
					<span class="ve-detail-field-value">{{ school.phone }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Address</span>
					<span class="ve-detail-field-value">{{ school.address }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Email Address</span>
					<span class="ve-detail-field-value">{{ school.email }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">State</span>
					<span class="ve-detail-field-value">{{ school.state }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">School Type</span>
					<span class="ve-detail-field-value">{{ school.type }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">District</span>
					<span class="ve-detail-field-value">{{ school.district }}</span>
				</div>
				<div class="ve-detail-field">
					<span class="ve-detail-field-label">Student Capacity</span>
					<span class="ve-detail-field-value">{{ school.capacity }} Students</span>
				</div>
				<div class="ve-detail-field" style="grid-column: 1 / -1">
					<span class="ve-detail-field-label">VE SPOC (Field Coordinator)</span>
					<span class="ve-detail-field-value">{{ school.spoc }}</span>
				</div>
			</div>

			<div class="ve-info-banner" style="margin-top: 1rem">
				CSV Import: School IDs ({{ school.id.split("-").slice(0, 2).join("-") }}-xxx) are
				preserved during bulk import to maintain legacy references across systems.
			</div>
		</BaseWidget>

		<BaseWidget v-if="dispatches.length > 0">
			<template #header>
				<h2 class="ve-widget-title">Recent Dispatches to This School</h2>
			</template>

			<div class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>DC Number</th>
							<th>Dispatch Date</th>
							<th>Dispatched Items</th>
							<th>Quantity</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="d in dispatches" :key="d.dc">
							<td><span class="ve-link">{{ d.dc }}</span></td>
							<td>{{ d.date }}</td>
							<td>{{ d.items }}</td>
							<td>{{ d.qty }}</td>
							<td>
								<span
									class="ve-status-text"
									:class="`ve-status-text--${d.status === 'Completed' ? 'active' : 'inactive'}`"
								>
									{{ d.status }}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</BaseWidget>
	</div>
</template>
