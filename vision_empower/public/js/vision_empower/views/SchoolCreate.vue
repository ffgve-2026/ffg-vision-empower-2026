<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { SCHOOLS, nextMockId } from "../config/masterDataMock";

const router = useRouter();
const submitting = ref(false);

const form = ref({
	name: "",
	type: "Govt",
	state: "",
	district: "",
	contact: "",
	phone: "",
	email: "",
	capacity: "",
	spoc: "",
	address: "",
});

function submit() {
	submitting.value = true;

	const school = {
		id: nextMockId(SCHOOLS, "VE-SCH"),
		...form.value,
		capacity: Number(form.value.capacity) || 0,
	};
	SCHOOLS.push(school);

	showToast({ message: `${school.name} added to the School Master.`, variant: "success" });
	router.push({ name: "school-detail", params: { schoolId: school.id } });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>New School</h2>
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">School Profile</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="submit">
				<div class="ve-field">
					<label class="ve-field-label">School Name</label>
					<input v-model="form.name" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">School Type</label>
					<select v-model="form.type" class="ve-field-input">
						<option>Govt</option>
						<option>Private</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">State</label>
					<input v-model="form.state" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">District</label>
					<input v-model="form.district" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Contact Person</label>
					<input v-model="form.contact" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Phone Number</label>
					<input v-model="form.phone" class="ve-field-input" type="tel" placeholder="+91 XXXXX XXXXX" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Email Address</label>
					<input v-model="form.email" class="ve-field-input" type="email" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Student Capacity</label>
					<input v-model="form.capacity" class="ve-field-input" type="number" min="0" required />
				</div>
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">VE SPOC (Field Coordinator)</label>
					<input
						v-model="form.spoc"
						class="ve-field-input"
						type="text"
						placeholder="Name (email@visionempower.org)"
						required
					/>
				</div>
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Address</label>
					<input v-model="form.address" class="ve-field-input" type="text" required />
				</div>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button type="submit" class="ve-button ve-button--primary" :disabled="submitting">
						{{ submitting ? "Saving..." : "Save School" }}
					</button>
					<button type="button" class="ve-outline-button" @click="router.push({ name: 'schools' })">
						Cancel
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>
