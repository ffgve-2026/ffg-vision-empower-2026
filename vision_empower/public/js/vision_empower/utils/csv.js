// Client-side CSV export utilities. These work end-to-end today against
// the local mock arrays in config/masterDataMock.js and each page's own
// mock rows — no backend involved, the browser builds the file and
// triggers the download itself. Whoever wires up the real APIs can swap
// the mock array passed into downloadCsv() for the rows returned by a
// frappe.call() (list endpoint, report endpoint, etc.) and keep using
// the same `columns` definitions and download mechanics unchanged.
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
			columns
				.map((c) => escapeCsvValue(c.value ? c.value(row) : row[c.key]))
				.join(",")
		)
		.join("\n");
	return `${header}\n${body}`;
}

export function downloadCsv(filename, rows, columns) {
	const csv = toCsv(rows, columns);
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
