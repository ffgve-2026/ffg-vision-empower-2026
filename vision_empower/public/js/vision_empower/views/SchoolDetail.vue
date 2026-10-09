<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { CATEGORY_BADGE } from "../config/masterDataMock";
import { callApi, formatDate } from "../utils/api";
import { ROLES, userHasAnyRole } from "../config/roles";

const route = useRoute();
const router = useRouter();
const canManage = userHasAnyRole([ROLES.ADMIN]);

const school = ref({
	id: "",
	school_name: "",
	address: "",
	district: "",
	state: "",
	pincode: 0,
	contact_person: "",
	contact_phone: "",
	contact_email: "",
	student_count: 0,
	students_with_disabilities: 0,
	active: "-",
	city: "",
	school_type: "-",
});
const dispatches = ref([]);

async function loadDispatches() {
	const rows = await callApi("list_school_dispatches", { school: route.params.schoolId });
	dispatches.value = rows.map((row) => ({
		dc: row.name,
		pr: row.procurement_requisition,
		date: formatDate(row.dispatch_date),
		items: row.item,
		qty: row.kit_qty,
		status: row.status,
	}));
}

function openDispatch(d) {
	router.push({ name: "procurement-status", params: { prId: d.pr } });
}

const loading = ref(false);
const error = ref("");

const editing = ref(false);
const editForm = ref({});
const saving = ref(false);

async function loadSchool() {
	loading.value = true;
	error.value = "";

	try {
		const response = await frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "School",
				name: route.params.schoolId,
			},
		});

		const data = response.message;

		if (!data) {
			throw new Error("School not found");
		}

		school.value = {
			id: data.name,
			name: data.school_name,
			contact: data.contact_person || "-",
			phone: data.contact_phone || "-",
			email: data.contact_email || "-",
			address: data.address || "-",
			district: data.district || "-",
			state: data.state || "-",
			pincode: data.pincode ?? 0,
			city: data.city || "-",
			disablecount: data.students_with_disabilities ?? 0,
			capacity: data.student_count ?? 0,
			type: data.school_type || "-",
			status: data.active ? "Active" : "Inactive",
		};
	} catch (err) {
		console.error("Failed to load school:", err);
		error.value = "Failed to load school.";
	} finally {
		loading.value = false;
	}
}

onMounted(() => {
	loadSchool();
	loadDispatches();
});

function startEdit() {
	editForm.value = {
		school_name: school.value.name,
		contact_person: school.value.contact === "-" ? "" : school.value.contact,
		contact_phone: school.value.phone === "-" ? "" : school.value.phone,
		contact_email: school.value.email === "-" ? "" : school.value.email,
		address: school.value.address === "-" ? "" : school.value.address,
		district: school.value.district === "-" ? "" : school.value.district,
		state: school.value.state === "-" ? "" : school.value.state,
		city: school.value.city === "-" ? "" : school.value.city,
		pincode: school.value.pincode || "",
		student_count: school.value.capacity || 0,
		students_with_disabilities: school.value.disablecount || 0,
		school_type: school.value.type === "-" ? "Govt" : school.value.type,
	};
	editing.value = true;
}

function cancelEdit() {
	editing.value = false;
}

async function saveEdit() {
	saving.value = true;

	try {
		await frappe.call({
			method: "frappe.client.set_value",
			args: {
				doctype: "School",
				name: school.value.id,
				fieldname: {
					...editForm.value,
					student_count: Number(editForm.value.student_count) || 0,
					students_with_disabilities:
						Number(editForm.value.students_with_disabilities) || 0,
				},
			},
		});

		showToast({ message: "School updated.", variant: "success" });
		editing.value = false;
		await loadSchool();
	} catch (err) {
		console.error("Failed to update school:", err);
		showToast({ message: "Failed to update school.", variant: "error" });
	} finally {
		saving.value = false;
	}
}

async function deleteSchool() {
	if (!window.confirm(`Delete school "${school.value.name}"? This cannot be undone.`)) return;

	try {
		await frappe.call({
			method: "frappe.client.delete",
			args: { doctype: "School", name: school.value.id },
		});

		showToast({ message: "School deleted.", variant: "success" });
		router.push({ name: "schools" });
	} catch (err) {
		console.error("Failed to delete school:", err);
		showToast({ message: "Failed to delete school.", variant: "error" });
	}
}
</script>

<template>
	<div class="ve-view">
		<div v-if="loading" class="ve-pagination-note">Loading school...</div>
		<div v-else-if="error" class="ve-pagination-note">{{ error }}</div>

		<template v-else>
			<BaseWidget>
				<div class="ve-detail-header">
					<div class="ve-detail-header-left">
						<h2 class="ve-widget-title">{{ school.name }}</h2>
						<span class="ve-badge" :class="`ve-badge--${CATEGORY_BADGE[school.type]}`">
							{{ school.type }}
						</span>
					</div>
					<div v-if="canManage && !editing" class="ve-detail-actions">
						<button class="ve-link-button" @click="startEdit">Edit Details</button>
						<button
							class="ve-outline-button ve-outline-button--danger"
							@click="deleteSchool"
						>
							Delete School
						</button>
					</div>
				</div>
			</BaseWidget>

			<BaseWidget>
				<template #header>
					<h2 class="ve-widget-title">School Profile Information</h2>
				</template>

				<form v-if="editing" class="ve-form-grid" @submit.prevent="saveEdit">
					<div class="ve-field">
						<label class="ve-field-label">School Name</label>
						<input
							v-model="editForm.school_name"
							class="ve-field-input"
							type="text"
							required
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">School Type</label>
						<select v-model="editForm.school_type" class="ve-field-input">
							<option>Govt</option>
							<option>Private</option>
						</select>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Contact Person</label>
						<input
							v-model="editForm.contact_person"
							class="ve-field-input"
							type="text"
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Phone Number</label>
						<input
							v-model="editForm.contact_phone"
							class="ve-field-input"
							type="tel"
						/>
					</div>
					<div class="ve-field" style="grid-column: 1 / -1">
						<label class="ve-field-label">Address</label>
						<input v-model="editForm.address" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">City</label>
						<input v-model="editForm.city" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Email Address</label>
						<input
							v-model="editForm.contact_email"
							class="ve-field-input"
							type="email"
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">State</label>
						<input v-model="editForm.state" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">District</label>
						<input v-model="editForm.district" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Pincode</label>
						<input v-model="editForm.pincode" class="ve-field-input" type="text" />
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Student Capacity</label>
						<input
							v-model="editForm.student_count"
							class="ve-field-input"
							type="number"
							min="0"
						/>
					</div>
					<div class="ve-field">
						<label class="ve-field-label">Students With Disabilities</label>
						<input
							v-model="editForm.students_with_disabilities"
							class="ve-field-input"
							type="number"
							min="0"
						/>
					</div>
					<div class="ve-form-actions" style="grid-column: 1 / -1">
						<button
							type="submit"
							class="ve-button ve-button--primary"
							:disabled="saving"
						>
							{{ saving ? "Saving..." : "Save" }}
						</button>
						<button type="button" class="ve-outline-button" @click="cancelEdit">
							Cancel
						</button>
					</div>
				</form>

				<div v-else class="ve-detail-grid">
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">School ID</span>
						<span class="ve-detail-field-value ve-detail-field-value--disabled">{{
							school.id
						}}</span>
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
						<span class="ve-detail-field-label">City</span>
						<span class="ve-detail-field-value">{{ school.city }}</span>
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
						<span class="ve-detail-field-label">Pincode</span>
						<span class="ve-detail-field-value">{{ school.pincode }}</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Student Capacity</span>
						<span class="ve-detail-field-value">{{ school.capacity }} Students</span>
					</div>
					<div class="ve-detail-field">
						<span class="ve-detail-field-label">Student with disabilities</span>
						<span class="ve-detail-field-value"
							>{{ school.disablecount }} Students</span
						>
					</div>
				</div>

				<div v-if="!editing" class="ve-info-banner" style="margin-top: 1rem">
					CSV Import: School IDs ({{ school.id.split("-").slice(0, 2).join("-") }}-xxx)
					are preserved during bulk import to maintain legacy references across systems.
				</div>
			</BaseWidget>

			<BaseWidget v-if="!editing && dispatches.length > 0">
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
								<td @click="openDispatch(d)">
									<span class="ve-link">{{ d.dc }}</span>
								</td>
								<td>{{ d.date }}</td>
								<td>{{ d.items }}</td>
								<td>{{ d.qty }}</td>
								<td>
									<span
										class="ve-status-text"
										:class="`ve-status-text--${
											d.status === 'Delivered' ? 'active' : 'inactive'
										}`"
									>
										{{ d.status }}
									</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</BaseWidget>
		</template>
	</div>
</template>
