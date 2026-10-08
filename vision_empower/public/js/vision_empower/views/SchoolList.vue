<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();

const search = ref("");
const stateFilter = ref("");
const typeFilter = ref("");
const schools = ref([]);
const loading = ref(false);
const error = ref("");

const canManage = userHasAnyRole([ROLES.ADMIN]);

async function loadSchools() {
    loading.value = true;
    error.value = "";

    try {
        const response = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "School",
                fields: [
                    "name",
                    "school_name",
                    "state",
                    "district",
                    "contact_person",
                    "contact_phone",
                    "student_count",
                    "school_type",
                    "active"
                ],
                order_by: "creation desc",
                limit_page_length: 100
            }
        });

        schools.value = (response.message || []).map((school) => ({
            id: school.name,
            name: school.school_name,
            state: school.state || "-",
            district: school.district || "-",
            contact: school.contact_person || "-",
            phone: school.contact_phone || "-",
            type: school.school_type || "-",
            capacity: school.student_count ?? 0,
            active: school.active
        }));
    } catch (err) {
        console.error("Failed to load schools:", err);
        error.value = "Failed to load schools.";
    } finally {
        loading.value = false;
    }
}

onMounted(loadSchools);

const states = computed(() =>
    [...new Set(schools.value.map((s) => s.state))]
        .filter((state) => state !== "-")
        .sort()
);

const filtered = computed(() =>
    schools.value.filter((school) => {
        const term = search.value.trim().toLowerCase();

        const matchesSearch =
            !term || school.name.toLowerCase().includes(term);

        const matchesState =
            !stateFilter.value || school.state === stateFilter.value;

        // Type is not currently available in the School DocType.
        const matchesType =
            !typeFilter.value || school.type === typeFilter.value;

        return matchesSearch && matchesState && matchesType;
    })
);

function openSchool(school) {
    router.push({
        name: "school-detail",
        params: { schoolId: school.id }
    });
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
				<select class="ve-field-input" style="max-width: 160px" disabled>
                    <option value="">Type: Not Available</option>
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
								<span class="ve-badge ve-badge--gray">
                                    {{ school.type }}
                                </span>
							</td>
							<td>{{ school.capacity }} Students</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-pagination-note">
				Showing {{ filtered.length }} of {{ schools.length }} schools
			</div>
		</BaseWidget>
	</div>
</template>
