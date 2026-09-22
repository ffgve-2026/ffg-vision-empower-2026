<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
	currentStage: {
		type: String,
		required: true,
	},
});

const router = useRouter();

const stages = [
	{ id: "requisition", label: "Requisition" },
	{ id: "approval", label: "Approval" },
	{ id: "quotations", label: "Quotations" },
	{ id: "vendor-selection", label: "Vendor Selection" },
	{ id: "payment-approval", label: "Payment Approval" },
	{ id: "payment", label: "Payment" },
	{ id: "dispatch", label: "Dispatch" },
	{ id: "delivery", label: "Delivery" },
];

const currentIndex = computed(() => {
	return stages.findIndex((stage) => stage.id === props.currentStage);
});

const previousStage = computed(() => {
	if (currentIndex.value <= 0) {
		return null;
	}

	return stages[currentIndex.value - 1];
});

function goBack() {
	if (!previousStage.value) {
		return;
	}

	router.back();
}

function isCompleted(index) {
	return index <= currentIndex.value;
}

function isCurrent(index) {
	return index === currentIndex.value;
}
</script>

<template>
	<div class="ve-procurement-navigation">
		<button
			v-if="previousStage"
			type="button"
			class="ve-back-button"
			@click="goBack"
		>
			← Back to {{ previousStage.label }}
		</button>
	</div>

	<div class="ve-pipeline">
		<div
			v-for="(stage, index) in stages"
			:key="stage.id"
			class="ve-pipeline-stage"
		>
			<div
				class="ve-pipeline-step"
				:class="{
					've-pipeline-step--completed': isCompleted(index),
					've-pipeline-step--current': isCurrent(index),
				}"
			>
				<div class="ve-pipeline-dot">
					<span v-if="isCompleted(index)">✓</span>
				</div>

				<div class="ve-pipeline-label">
					{{ stage.label }}
				</div>
			</div>

			<div
				v-if="index < stages.length - 1"
				class="ve-pipeline-line"
				:class="{
					've-pipeline-line--completed': index < currentIndex,
				}"
			></div>
		</div>
	</div>
</template>