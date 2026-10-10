// Client-side CSV export: the browser builds the file from rows a page
// already loaded (the full result of its report endpoint — not just the
// rows visible on screen) and triggers the download itself.
//
// Column definition shape: { label, key } for a plain field, or
// { label, value: (row) => ... } when the CSV cell needs to be derived
// (e.g. joining an array field, formatting a date).

function escapeCsvValue(value) {
	const str = value === null || value === undefined ? "" : String(value);
	if (/[",\n]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function toCsv(rows, columns) {
	const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
	const body = rows
		.map((row) =>
			columns.map((c) => escapeCsvValue(c.value ? c.value(row) : row[c.key])).join(",")
		)
		.join("\n");
	return `${header}\n${body}`;
}

export function downloadCsv(filename, rows, columns) {
	// The BOM makes Excel read the file as UTF-8, so ₹ and non-English
	// names don't come out garbled. Our own importer strips it (utf-8-sig).
	const csv = "\uFEFF" + toCsv(rows, columns);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}
