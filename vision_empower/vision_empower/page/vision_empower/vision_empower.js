// frappe.pages['vision-empower'].on_page_load = function(wrapper) {
// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: 'Vision Empower',
// 		single_column: true
// 	});
//
// 	const main = $(wrapper).find(".layout-main-section");
//
// 	main.html(`
//         <div class="container-fluid">
//
//             <div class="mb-4">
//                 <h2>Hello, Vision Empower!</h2>
//                 <p class="text-muted">
//                     Welcome to the Vision Empower application.
//                 </p>
//             </div>
//
//             <div class="row mb-4">
//                 <div class="col-md-4">
//                     <div class="card">
//                         <div class="card-body">
//                             <div class="text-muted">
//                                 Test Items
//                             </div>
//
//                             <div
//                                 id="test-item-count"
//                                 style="font-size: 28px; font-weight: 600;"
//                             >
//                                 -
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//
//             <div class="card">
//                 <div class="card-body">
//
//                     <h4>Recent Test Items</h4>
//
//                     <div id="test-items">
//                         Loading...
//                     </div>
//
//                     <div class="mt-3">
//                         <button
//                             class="btn btn-primary"
//                             id="view-test-items"
//                         >
//                             View All Test Items
//                         </button>
//                     </div>
//
//                 </div>
//             </div>
//
//         </div>
//     `);
//
// 	frappe.call({
// 		method: "frappe.client.get_list",
// 		args: {
// 			doctype: "Test Item",
// 			fields: ["name", "description"],
// 			limit_page_length: 10,
// 			order_by: "modified desc",
// 		},
// 		callback: function (response) {
// 			const items = response.message || [];
//
// 			$("#test-item-count").text(items.length);
//
// 			if (items.length === 0) {
// 				$("#test-items").html(
// 					"<p class='text-muted'>No Test Items found.</p>"
// 				);
// 				return;
// 			}
//
// 			const html = items
// 				.map(
// 					(item) => `
//                         <div class="py-2 border-bottom">
//                             <strong>${item.name}</strong>
//                             <div class="text-muted">
//                                 ${item.description || ""}
//                             </div>
//                         </div>
//                     `
// 				)
// 				.join("");
//
// 			$("#test-items").html(html);
// 		},
// 	});
//
// 	main.find("#view-test-items").on("click", () => {
// 		frappe.set_route("List", "Test Item");
// 	});
// }

frappe.pages["vision-empower"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: "Vision Empower",
		single_column: true,
	});

	if (frappe.boot.developer_mode) {
		frappe.hot_update ??= [];
		frappe.hot_update.push(() => load_vue(wrapper));
	}
};

frappe.pages["vision-empower"].on_page_show = (wrapper) => {
	load_vue(wrapper);
};

async function load_vue(wrapper) {
	const $parent = $(wrapper).find(".layout-main-section");

	$parent.empty();

	await frappe.require(["vision_empower.bundle.css", "vision_empower.bundle.js"]);

	frappe.vision_empower_app = frappe.ui.setup_vue(
		$parent.get(0)
	);
}
