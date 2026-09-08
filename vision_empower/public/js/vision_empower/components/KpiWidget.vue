<script setup>
import BaseWidget from "./BaseWidget.vue";

defineProps({
	label: { type: String, required: true },
	value: { type: String, required: true },
	accent: { type: String, required: true },
	note: { type: String, default: "" },
	noteVariant: {
		type: String,
		default: "",
		validator: (v) => ["", "success", "danger", "warning"].includes(v),
	},
	progressPercent: { type: Number, default: null },
});
</script>

<template>
	<BaseWidget :accent="accent">
		<div class="ve-kpi-label">{{ label }}</div>
		<div class="ve-kpi-value">{{ value }}</div>
		<div v-if="note" class="ve-kpi-note" :class="noteVariant && `ve-kpi-note--${noteVariant}`">
			{{ note }}
		</div>
		<div v-if="progressPercent !== null" class="ve-progress-track">
			<div class="ve-progress-fill" :style="{ width: progressPercent + '%' }" />
		</div>
	</BaseWidget>
</template>
