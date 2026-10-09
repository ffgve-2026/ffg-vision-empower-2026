<script setup>
// "Import CSV" + "Template" toolbar buttons for a Master Data list. Posts
// the file to bulk_import_csv, which re-checks the caller's role.
import { ref } from "vue";
import { showToast } from "./toast/useToast";
import { callApi } from "../utils/api";
import { downloadCsv } from "../utils/csv";

const props = defineProps({
	doctype: { type: String, required: true },
});
const emit = defineEmits(["imported"]);

const importing = ref(false);
const inputId = `ve-import-${props.doctype.toLowerCase().replace(/\s+/g, "-")}`;

async function downloadTemplate() {
	const headers = await callApi("get_import_template", { doctype: props.doctype });
	downloadCsv(
		`${props.doctype.toLowerCase().replace(/\s+/g, "-")}-import-template`,
		[],
		headers.map((label) => ({ label, key: label }))
	);
}

async function handleFile(event) {
	const file = event.target.files?.[0];
	event.target.value = "";
	if (!file) return;

	importing.value = true;
	try {
		const formData = new FormData();
		formData.append("file", file, file.name);
		formData.append("doctype", props.doctype);

		const response = await fetch("/api/method/vision_empower.vision_empower.api.bulk_import_csv", {
			method: "POST",
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
			body: formData,
		});
		const body = await response.json();
		if (!response.ok) throw new Error(body._server_messages || body.exception || response.statusText);

		const result = body.message;
		if (result.errors.length) console.warn(`${props.doctype} import errors:`, result.errors);
		const ignored = result.ignored_columns.length ? ` Ignored columns: ${result.ignored_columns.join(", ")}.` : "";
		showToast({
			message: result.errors.length
				? `Imported ${result.imported}, ${result.errors.length} failed — first: ${result.errors[0]}.${ignored}`
				: `Imported ${result.imported} record(s).${ignored}`,
			variant: result.status === "success" ? "success" : result.imported ? "warning" : "danger",
		});
		if (result.imported) emit("imported");
	} catch (error) {
		console.error("CSV import failed:", error);
		showToast({ message: "CSV import failed.", variant: "danger" });
	} finally {
		importing.value = false;
	}
}
</script>

<template>
	<button type="button" class="ve-outline-button" @click="downloadTemplate">Template</button>
	<label class="ve-outline-button" :for="inputId" style="cursor: pointer">
		{{ importing ? "Importing..." : "Import CSV" }}
	</label>
	<input :id="inputId" type="file" accept=".csv" style="display: none" :disabled="importing" @change="handleFile" />
</template>
