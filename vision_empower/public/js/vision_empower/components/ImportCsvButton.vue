<script setup>
// "Import CSV" + "Template" toolbar buttons for a Master Data list. Posts
// the file to bulk_import_csv, which re-checks the caller's role.
import { ref, onBeforeUnmount } from "vue";
import { showToast } from "./toast/useToast";
import { callApi } from "../utils/api";
import { downloadCsv } from "../utils/csv";

const props = defineProps({
	doctype: { type: String, required: true },
});
const emit = defineEmits(["imported"]);

const importing = ref(false);
const fileInput = ref(null);
const inputId = `ve-import-${props.doctype.toLowerCase().replace(/\s+/g, "-")}`;

// Formats that the field list alone doesn't make obvious.
const EXTRA_HINTS = {
	Kit: [
		'Kit Items: "Item name:qty; Item name:qty", e.g. "Braille Slate:1; Stylus:2".',
		"Kit Code must be unique; a row with an existing code fails.",
	],
	"Vendor Item Price": [
		"Adding a price for the same vendor and item again keeps both; the latest Effective Date is the one used.",
	],
};

// ⓘ panel: what Template / Import CSV do, plus this doctype's required
// columns and allowed values, read from its meta so they stay accurate.
const infoOpen = ref(false);
const infoWrap = ref(null);
const required = ref([]);
const choices = ref([]);
const hasDates = ref(false);

async function toggleInfo() {
	infoOpen.value = !infoOpen.value;
	if (!infoOpen.value || required.value.length) return;
	await new Promise((resolve) => frappe.model.with_doctype(props.doctype, resolve));
	const fields = frappe
		.get_meta(props.doctype)
		.fields.filter(
			(f) =>
				!f.hidden &&
				!f.read_only &&
				!["Section Break", "Column Break", "Tab Break"].includes(f.fieldtype)
		);
	required.value = fields.filter((f) => f.reqd).map((f) => f.label || f.fieldname);
	choices.value = fields
		.filter((f) => f.fieldtype === "Select" && f.options)
		.map((f) => ({
			label: f.label || f.fieldname,
			options: f.options.split("\n").filter(Boolean).join(", "),
		}));
	hasDates.value = fields.some((f) => f.fieldtype === "Date");
}

function closeInfo(event) {
	if (!infoOpen.value) return;
	if (
		event.type === "keydown" ? event.key === "Escape" : !infoWrap.value?.contains(event.target)
	)
		infoOpen.value = false;
}
document.addEventListener("click", closeInfo);
document.addEventListener("keydown", closeInfo);
onBeforeUnmount(() => {
	document.removeEventListener("click", closeInfo);
	document.removeEventListener("keydown", closeInfo);
});

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

		const response = await fetch(
			"/api/method/vision_empower.vision_empower.api.bulk_import_csv",
			{
				method: "POST",
				headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
				body: formData,
			}
		);
		const body = await response.json();
		if (!response.ok)
			throw new Error(body._server_messages || body.exception || response.statusText);

		const result = body.message;
		if (result.errors.length) console.warn(`${props.doctype} import errors:`, result.errors);
		const ignored = result.ignored_columns.length
			? ` Ignored columns: ${result.ignored_columns.join(", ")}.`
			: "";
		showToast({
			message: result.errors.length
				? `Imported ${result.imported}, ${result.errors.length} failed — first: ${result.errors[0]}.${ignored}`
				: `Imported ${result.imported} record(s).${ignored}`,
			variant:
				result.status === "success" ? "success" : result.imported ? "warning" : "danger",
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
	<span ref="infoWrap" class="ve-info-wrap">
		<button
			type="button"
			class="ve-info-button"
			:aria-expanded="infoOpen"
			aria-label="How CSV import works"
			title="How CSV import works"
			@click="toggleInfo"
		>
			i
		</button>
		<div
			v-if="infoOpen"
			class="ve-info-popover"
			role="dialog"
			aria-label="How CSV import works"
		>
			<div class="ve-info-title">Importing {{ doctype }} records</div>
			<ol class="ve-info-steps">
				<li><strong>Template</strong> downloads a blank CSV with this page's columns.</li>
				<li>Fill in one row per new record. Leave a column empty if it doesn't apply.</li>
				<li>
					<strong>Import CSV</strong> adds every row as a new record. Existing records
					are never changed or deleted.
				</li>
			</ol>
			<ul class="ve-info-notes">
				<li v-if="required.length">
					<strong>Required:</strong> {{ required.join(", ") }}
				</li>
				<li>Links to other records (vendor, item…) take the record's name or its ID.</li>
				<li>Active: 1, yes or true for active; anything else is inactive.</li>
				<li v-for="c in choices" :key="c.label">
					<strong>{{ c.label }}:</strong> one of {{ c.options }}
				</li>
				<li v-if="hasDates">Dates as YYYY-MM-DD.</li>
				<li v-for="hint in EXTRA_HINTS[doctype] || []" :key="hint">{{ hint }}</li>
				<li>
					Importing the same row twice creates a duplicate. To correct a record, open it
					and use Edit Details.
				</li>
				<li>
					A row with an error is skipped; the other rows are still imported, and the
					message shows the first error.
				</li>
			</ul>
		</div>
	</span>
	<!-- A real <button> (not a styled <label>): Desk's global label styles
	     shifted the label off the toolbar's baseline. -->
	<button
		type="button"
		class="ve-outline-button"
		:disabled="importing"
		@click="fileInput.click()"
	>
		{{ importing ? "Importing..." : "Import CSV" }}
	</button>
	<input
		ref="fileInput"
		:id="inputId"
		type="file"
		accept=".csv"
		style="display: none"
		@change="handleFile"
	/>
</template>
