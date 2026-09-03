import { createApp } from "vue";
import VisionEmpower from "./VisionEmpower.vue";

function setupVue(wrapper) {
	const app = createApp(VisionEmpower);
	app.mount(wrapper);
	return app;
}

frappe.ui.setup_vue = setupVue;

export default setupVue;
