// Thin wrappers around the backend's whitelisted methods in
// vision_empower/vision_empower/api.py, plus Frappe's file upload.

const API_MODULE = "vision_empower.vision_empower.api";

export async function callApi(method, args = {}) {
	const response = await frappe.call({ method: `${API_MODULE}.${method}`, args });
	return response.message;
}

// Uploads go up unattached and private; the stage endpoint that receives
// the returned file_url attaches it to the right record after its own
// role check (see _attach_file in api.py).
export async function uploadFile(file) {
	const formData = new FormData();
	formData.append("file", file, file.name);
	formData.append("is_private", "1");

	const response = await fetch("/api/method/upload_file", {
		method: "POST",
		headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
		body: formData,
	});
	if (!response.ok) throw new Error(`Upload failed (${response.status})`);

	const result = await response.json();
	return result.message;
}

export async function getList(doctype, fields, filters = {}, orderBy = "modified desc") {
	const response = await frappe.call({
		method: "frappe.client.get_list",
		args: { doctype, fields, filters, order_by: orderBy, limit_page_length: 500 },
	});
	return response.message || [];
}

export const formatInr = (amount) =>
	new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
		Number(amount) || 0
	);

export const formatDate = (value) =>
	value ? frappe.datetime.str_to_user(String(value).slice(0, 10)) : "";
