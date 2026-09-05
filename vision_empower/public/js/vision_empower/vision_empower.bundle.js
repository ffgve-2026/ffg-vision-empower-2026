import { createApp } from "vue";
import VisionEmpower from "./VisionEmpower.vue";
import { createAppRouter } from "./router";

function setupVue(wrapper) {
	const app = createApp(VisionEmpower);
	app.use(createAppRouter());
	app.mount(wrapper);
	return app;
}

frappe.ui.setup_vue = setupVue;

export default setupVue;
