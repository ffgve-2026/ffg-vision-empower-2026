<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { VENDORS, nextMockId } from "../config/masterDataMock";

const router = useRouter();
const submitting = ref(false);

const CATEGORIES = ["Books", "STEM", "CT", "Lab", "IT", "Braille"];

const form = ref({
	name: "",
	contact: "",
	phone: "",
	email: "",
	address: "",
	city: "",
	state: "",
	gst: "",
	pan: "",
	bank: "",
	account: "",
	ifsc: "",
	categories: [],
});

function submit() {
	submitting.value = true;

	const vendor = {
		id: nextMockId(VENDORS, "VE-VEN"),
		status: "Active",
		...form.value,
	};
	VENDORS.push(vendor);

	showToast({ message: `${vendor.name} added to the Vendor Master.`, variant: "success" });
	router.push({ name: "vendor-detail", params: { vendorId: vendor.id } });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>New Vendor</h2>
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Vendor Details</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="submit">
				<div class="ve-field">
					<label class="ve-field-label">Vendor Name</label>
					<input v-model="form.name" class="ve-field-input" type="text" required />
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
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Address</label>
					<input v-model="form.address" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">City</label>
					<input v-model="form.city" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">State</label>
					<input v-model="form.state" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">GST Number</label>
					<input v-model="form.gst" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">PAN Number</label>
					<input v-model="form.pan" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Bank Name</label>
					<input v-model="form.bank" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Account Number</label>
					<input v-model="form.account" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">IFSC Code</label>
					<input v-model="form.ifsc" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Categories</label>
					<div class="ve-checkbox-group">
						<label v-for="cat in CATEGORIES" :key="cat" class="ve-checkbox-item">
							<input v-model="form.categories" type="checkbox" :value="cat" />
							{{ cat }}
						</label>
					</div>
				</div>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button type="submit" class="ve-button ve-button--primary" :disabled="submitting">
						{{ submitting ? "Saving..." : "Save Vendor" }}
					</button>
					<button type="button" class="ve-outline-button" @click="router.push({ name: 'vendors' })">
						Cancel
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>
