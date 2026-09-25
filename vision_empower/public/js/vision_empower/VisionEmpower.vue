<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { NAV_ITEMS, userHasAnyRole } from "./config/roles";
import ToastContainer from "./components/toast/ToastContainer.vue";

// Styling uses plain classes from css/vision_empower.bundle.css, not
// Tailwind utility classes: Desk's compiled CSS is Tailwind, purged against
// Frappe's own source, so most utility class names we'd reach for
// (bg-gray-900, font-semibold, etc.) don't exist in the shipped CSS at all.
const route = useRoute();
const collapsed = ref(false);

const visibleNavItems = computed(() =>
	NAV_ITEMS.filter((item) => userHasAnyRole(item.roles)).map((item) => ({
		...item,
		children: item.children?.filter((child) => userHasAnyRole(child.roles)),
	}))
);

const breadcrumb = computed(() => ["Vision Empower", ...(route.meta.breadcrumb || [])]);

const userFullName = computed(() => {
	const userInfo = frappe.boot?.user_info?.[frappe.session.user];
	return userInfo?.fullname || frappe.session.user;
});

function isActive(item) {
	if (item.children) {
		return item.children.some((child) => child.name === route.name);
	}
	return item.name === route.name;
}
</script>

<template>
	<div class="ve-shell" :class="{ 've-shell--collapsed': collapsed }">
		<aside class="ve-sidebar">
			<div class="ve-sidebar-logo">
				<span class="ve-sidebar-logo-mark" />
				<div v-if="!collapsed" class="ve-sidebar-logo-text">
					<div class="ve-sidebar-logo-title">Vision Empower</div>
					<div class="ve-sidebar-logo-subtitle">NGO Procurement</div>
				</div>
			</div>

			<nav class="ve-sidebar-nav">
				<template v-for="item in visibleNavItems" :key="item.name">
					<router-link
						v-if="!item.children"
						:to="item.path"
						class="ve-sidebar-link"
						:class="{ 've-sidebar-link--active': isActive(item) }"
					>
						{{ item.label }}
					</router-link>

					<div v-else class="ve-sidebar-group">
						<div class="ve-sidebar-group-label" :class="{ 've-sidebar-link--active': isActive(item) }">
							{{ item.label }}
						</div>
						<router-link
							v-for="child in item.children"
							:key="child.name"
							:to="child.path"
							class="ve-sidebar-link ve-sidebar-link--child"
							:class="{ 've-sidebar-link--active': child.name === route.name }"
						>
							{{ child.label }}
						</router-link>
					</div>
				</template>
			</nav>

			<button class="ve-sidebar-collapse" @click="collapsed = !collapsed">
				{{ collapsed ? "▶" : "◀ Collapse Sidebar" }}
			</button>
		</aside>

		<div class="ve-main">
			<header class="ve-topbar">
				<div class="ve-breadcrumb">{{ breadcrumb.join(" / ") }}</div>
				<input class="ve-search" type="text" placeholder="Search documents, stock..." disabled />
				<div class="ve-topbar-right">
					<span class="ve-bell" title="Notifications">🔔</span>
					<span class="ve-user">{{ userFullName }} ▾</span>
				</div>
			</header>

			<main class="ve-content">
				<router-view />
			</main>
		</div>

		<ToastContainer />
	</div>
</template>
