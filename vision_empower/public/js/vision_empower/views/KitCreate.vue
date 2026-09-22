<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { KITS, VENDORS, nextMockId, formatInr } from "../config/masterDataMock";

const router = useRouter();
const submitting = ref(false);

const form = ref({
	name: "",
	vendor: VENDORS[0]?.name || "",
	schoolType: "Govt",
	itemCount: "",
	value: "",
});

function submit() {
	submitting.value = true;

	const kit = {
		id: nextMockId(KITS, "VE-KIT"),
		name: form.value.name,
		vendor: form.value.vendor,
		schoolType: form.value.schoolType,
		itemCount: Number(form.value.itemCount) || 0,
		value: formatInr(Number(form.value.value) || 0),
	};
	KITS.push(kit);

	showToast({ message: `${kit.name} added to the Kit Master.`, variant: "success" });
	router.push({ name: "kit-detail", params: { kitId: kit.id } });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>New Kit</h2>
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Kit Definition</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="submit">
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Kit Name</label>
					<input v-model="form.name" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Preferred Vendor</label>
					<select v-model="form.vendor" class="ve-field-input">
						<option v-for="v in VENDORS" :key="v.id" :value="v.name">{{ v.name }}</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Target School Type</label>
					<select v-model="form.schoolType" class="ve-field-input">
						<option>Govt</option>
						<option>Private</option>
						<option>Both</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Number of Items</label>
					<input v-model="form.itemCount" class="ve-field-input" type="number" min="0" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Calculated Kit Price (INR)</label>
					<input v-model="form.value" class="ve-field-input" type="number" min="0" step="0.01" required />
				</div>

				<p class="ve-field-hint" style="grid-column: 1 / -1">
					Add the individual items that make up this kit from the kit's detail page once it's saved.
				</p>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button type="submit" class="ve-button ve-button--primary" :disabled="submitting">
						{{ submitting ? "Saving..." : "Save Kit" }}
					</button>
					<button type="button" class="ve-outline-button" @click="router.push({ name: 'kits' })">
						Cancel
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>
