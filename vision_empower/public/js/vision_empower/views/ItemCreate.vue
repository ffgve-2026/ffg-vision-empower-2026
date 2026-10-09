<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";

const router = useRouter();
const submitting = ref(false);

// Matches the real Item DocType's Category Select options exactly.
const CATEGORIES = ["Books", "STEM", "CT", "Lab", "Braille", "IT", "AT"];

const form = ref({
	item_name: "",
	category: CATEGORIES[0],
	unit: "",
	school_norm_qty: "",
});

async function submit() {
	submitting.value = true;

	try {
		const response = await frappe.call({
			method: "frappe.client.insert",
			args: {
				doc: {
					doctype: "Item",
					item_name: form.value.item_name,
					category: form.value.category,
					unit: form.value.unit,
					school_norm_qty: Number(form.value.school_norm_qty) || 0,
					active: 1,
				},
			},
		});

		const item = response.message;

		showToast({ message: `${item.item_name} added to the Item Master.`, variant: "success" });
		router.push({ name: "item-detail", params: { itemId: item.name } });
	} catch (err) {
		console.error("Failed to create item:", err);
		showToast({ message: "Failed to create item.", variant: "error" });
	} finally {
		submitting.value = false;
	}
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
					<input v-model="form.item_name" class="ve-field-input" type="text" required />
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
					<label class="ve-field-label">Per-School Qty Norm</label>
					<input v-model="form.school_norm_qty" class="ve-field-input" type="number" min="0" step="0.01" required />
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
