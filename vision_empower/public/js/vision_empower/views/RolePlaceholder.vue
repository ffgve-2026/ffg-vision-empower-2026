<script setup>
import BaseWidget from "../components/BaseWidget.vue";

defineProps({
	title: { type: String, required: true },
});
</script>

<template>
	<BaseWidget>
		<template #header>
			<h2 class="ve-widget-title">{{ title }}</h2>
		</template>
		<p class="ve-subtitle">This section is scaffolded and awaiting the real workflow design.</p>
	</BaseWidget>
</template>
