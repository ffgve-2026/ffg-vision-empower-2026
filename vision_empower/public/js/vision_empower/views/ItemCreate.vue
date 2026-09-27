<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";
import { ITEMS, VENDORS, nextMockId, formatInr } from "../config/masterDataMock";

const router = useRouter();
const submitting = ref(false);

const CATEGORIES = ["Books", "STEM", "CT", "Lab", "IT", "Braille"];

const form = ref({
	name: "",
	category: CATEGORIES[0],
	unit: "",
	vendor: VENDORS[0]?.name || "",
	norm: "",
	price: "",
});

function submit() {
	submitting.value = true;

	const item = {
		id: nextMockId(ITEMS, "VE-ITM"),
		...form.value,
		price: formatInr(Number(form.value.price) || 0),
	};
	ITEMS.push(item);

	showToast({ message: `${item.name} added to the Item Master.`, variant: "success" });
	router.push({ name: "item-detail", params: { itemId: item.id } });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>New Item</h2>
		</div>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">General Specifications</h2>
			</template>

			<form class="ve-form-grid" @submit.prevent="submit">
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Item Name</label>
					<input v-model="form.name" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Category</label>
					<select v-model="form.category" class="ve-field-input">
						<option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Unit</label>
					<input v-model="form.unit" class="ve-field-input" type="text" placeholder="e.g. Nos, Set, Kit" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Preferred Vendor</label>
					<select v-model="form.vendor" class="ve-field-input">
						<option v-for="v in VENDORS" :key="v.id" :value="v.name">{{ v.name }}</option>
					</select>
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Per-School Qty Norm</label>
					<input v-model="form.norm" class="ve-field-input" type="text" placeholder="e.g. 1 Kit" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Unit Price (INR)</label>
					<input v-model="form.price" class="ve-field-input" type="number" min="0" step="0.01" required />
				</div>

				<div class="ve-form-actions" style="grid-column: 1 / -1">
					<button type="submit" class="ve-button ve-button--primary" :disabled="submitting">
						{{ submitting ? "Saving..." : "Save Item" }}
					</button>
					<button type="button" class="ve-outline-button" @click="router.push({ name: 'items' })">
						Cancel
					</button>
				</div>
			</form>
		</BaseWidget>
	</div>
</template>
