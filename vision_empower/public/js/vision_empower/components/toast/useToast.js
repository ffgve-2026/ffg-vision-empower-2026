import { reactive } from "vue";

// Reusable toast/notification system. Not frappe-ui's Toast (same
// defineProps<T>() build incompatibility as every other frappe-ui
// component on this bench — see CLAUDE.md) and not frappe.show_alert
// (kept local so it's themeable/testable with the rest of this app's
// own components). Mounted once via ToastContainer.vue in
// VisionEmpower.vue; call showToast() from anywhere.

const state = reactive({
	toasts: [],
});

let nextId = 1;

const DEFAULT_DURATION_MS = 4000;

export function showToast({ message, variant = "success", duration = DEFAULT_DURATION_MS }) {
	const id = nextId++;
	state.toasts.push({ id, message, variant });

	if (duration > 0) {
		setTimeout(() => dismissToast(id), duration);
	}

	return id;
}

export function dismissToast(id) {
	const index = state.toasts.findIndex((toast) => toast.id === id);
	if (index !== -1) state.toasts.splice(index, 1);
}

export function useToast() {
	return { toasts: state.toasts, showToast, dismissToast };
}
