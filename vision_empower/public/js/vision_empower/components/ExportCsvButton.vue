<script setup>
// "Export CSV" toolbar button. Two modes:
// - `doctype`: a Master Data list — the server sends every record the user
//   can read, in the import template's columns (export_csv_rows).
// - `rows` + `columns`: any other list — exports the rows the page loaded
//   (pass the full list, not the search-filtered one, unless that's intended).
import { ref } from "vue";
import { showToast } from "./toast/useToast";
import { callApi } from "../utils/api";
import { downloadCsv } from "../utils/csv";

const props = defineProps({
	doctype: { type: String, default: "" },
	rows: { type: Array, default: null },
	columns: { type: Array, default: null },
	filename: { type: String, default: "" },
});

const exporting = ref(false);

const slug = (s) => s.toLowerCase().replace(/\s+/g, "-");

async function exportCsv() {
	exporting.value = true;
	try {
		const name = `${props.filename || slug(props.doctype)}-${frappe.datetime.get_today()}`;
		if (props.doctype) {
			const { columns, rows } = await callApi("export_csv_rows", { doctype: props.doctype });
			downloadCsv(
				name,
				rows,
				columns.map((label) => ({ label, key: label }))
			);
		} else {
			downloadCsv(name, props.rows || [], props.columns || []);
		}
	} catch (error) {
		console.error("CSV export failed:", error);
		showToast({ message: "CSV export failed.", variant: "danger" });
	} finally {
		exporting.value = false;
	}
}
</script>

<template>
	<button class="ve-outline-button" :disabled="exporting" @click="exportCsv">
		{{ exporting ? "Exporting..." : "Export CSV" }}
	</button>
</template>
