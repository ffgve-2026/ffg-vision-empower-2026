<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";

const router = useRouter();
const submitting = ref(false);

const form = ref({
	kit_name: "",
	kit_code: "",
	description: "",
});

async function submit() {
	submitting.value = true;

	try {
		const response = await frappe.call({
			method: "frappe.client.insert",
			args: {
				doc: {
					doctype: "Kit",
					kit_name: form.value.kit_name,
					kit_code: form.value.kit_code,
					description: form.value.description,
					active: 1,
				},
			},
		});

		const kit = response.message;

		showToast({ message: `${kit.kit_name} added to the Kit Master.`, variant: "success" });
		router.push({ name: "kit-detail", params: { kitId: kit.name } });
	} catch (err) {
		console.error("Failed to create kit:", err);
		showToast({ message: "Failed to create kit.", variant: "error" });
	} finally {
		submitting.value = false;
	}
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
					<input v-model="form.kit_name" class="ve-field-input" type="text" required />
				</div>
				<div class="ve-field">
					<label class="ve-field-label">Kit Code</label>
					<input v-model="form.kit_code" class="ve-field-input" type="text" placeholder="e.g. CT-PRIMARY-01" required />
				</div>
				<div class="ve-field" style="grid-column: 1 / -1">
					<label class="ve-field-label">Description</label>
					<input v-model="form.description" class="ve-field-input" type="text" />
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
