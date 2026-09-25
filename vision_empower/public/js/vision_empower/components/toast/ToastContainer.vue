<script setup>
import { useToast } from "./useToast";

const { toasts, dismissToast } = useToast();
</script>

<template>
	<div class="ve-toast-container">
		<div
			v-for="toast in toasts"
			:key="toast.id"
			class="ve-toast"
			:class="`ve-toast--${toast.variant}`"
			@click="dismissToast(toast.id)"
		>
			{{ toast.message }}
		</div>
	</div>
</template>
