frappe.pages['test-frappe-page'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Frappe Test Page',
		single_column: true
	});
}