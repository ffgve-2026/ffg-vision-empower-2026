<script setup>
// Shared foundation for every dashboard/page widget: bordered box, optional
// colored accent (left border), optional loading state. Deliberately does
// NOT impose a fixed header shape — widgets compose their own header
// content via the #header slot (a title+subtitle, a KPI label, or nothing),
// so this stays reusable for genuinely different widget shapes instead of
// forcing them through one rigid prop API.
//
// Local replacement for frappe-ui's Card: most of Card.vue's own Tailwind
// classes (flex-col, px-6, items-baseline, text-gray-600, etc.) don't exist
// in Desk's purged CSS, so it rendered visibly broken (no border, no
// padding). This is styled with our own plain CSS in
// css/vision_empower.bundle.css instead.
defineProps({
	loading: { type: Boolean, default: false },
	accent: { type: String, default: "" },
});
</script>

<template>
	<div class="ve-widget" :style="accent ? { borderLeftColor: accent } : null" :class="{ 've-widget--accent': accent }">
		<div v-if="$slots.header" class="ve-widget-header">
			<slot name="header" />
		</div>

		<div v-if="loading" class="ve-widget-loading">Loading...</div>
		<div v-else class="ve-widget-body">
			<slot />
		</div>
	</div>
</template>
