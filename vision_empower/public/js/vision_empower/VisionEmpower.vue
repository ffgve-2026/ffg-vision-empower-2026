<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { NAV_ITEMS, userHasAnyRole } from "./config/roles";
import ToastContainer from "./components/toast/ToastContainer.vue";

// Styling uses plain classes from css/vision_empower.bundle.css, not
// Tailwind utility classes: Desk's compiled CSS is Tailwind, purged against
// Frappe's own source, so most utility class names we'd reach for
// (bg-gray-900, font-semibold, etc.) don't exist in the shipped CSS at all.
const route = useRoute();
const router = useRouter();
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

// Global search — queries real Master Data across Vendor/School/Item/Kit
// and jumps straight to the matching record's detail page. Deliberately
// not a single combined backend endpoint: each of these is already a
// plain frappe.client.get_list call elsewhere in the app, so four small
// parallel calls here avoid adding a new whitelisted method just for this.
const globalSearch = ref("");
const searchResults = ref([]);
const searching = ref(false);
const showResults = ref(false);
let searchDebounce = null;

const SEARCH_SOURCES = [
	{ type: "Vendor", doctype: "Vendor", nameField: "vendor_name", route: "vendor-detail", param: "vendorId" },
	{ type: "School", doctype: "School", nameField: "school_name", route: "school-detail", param: "schoolId" },
	{ type: "Item", doctype: "Item", nameField: "item_name", route: "item-detail", param: "itemId" },
	{ type: "Kit", doctype: "Kit", nameField: "kit_name", route: "kit-detail", param: "kitId" },
];

async function runSearch(term) {
	searching.value = true;

	try {
		const resultSets = await Promise.all(
			SEARCH_SOURCES.map((source) =>
				frappe
					.call({
						method: "frappe.client.get_list",
						args: {
							doctype: source.doctype,
							fields: ["name", source.nameField],
							filters: [[source.nameField, "like", `%${term}%`]],
							limit_page_length: 5,
						},
					})
					.then((response) => (response.message || []).map((row) => ({
						type: source.type,
						id: row.name,
						label: row[source.nameField] || row.name,
						routeName: source.route,
						param: source.param,
					})))
					.catch(() => [])
			)
		);

		searchResults.value = resultSets.flat();
		showResults.value = true;
	} finally {
		searching.value = false;
	}
}

function onSearchInput() {
	clearTimeout(searchDebounce);
	const term = globalSearch.value.trim();

	if (term.length < 2) {
		searchResults.value = [];
		showResults.value = false;
		return;
	}

	searchDebounce = setTimeout(() => runSearch(term), 250);
}

function openResult(result) {
	router.push({ name: result.routeName, params: { [result.param]: result.id } });
	globalSearch.value = "";
	searchResults.value = [];
	showResults.value = false;
}

function hideResultsSoon() {
	// Delay so a click on a result (which blurs the input first) still
	// registers before the dropdown disappears.
	setTimeout(() => {
		showResults.value = false;
	}, 150);
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
						active-class=""
						exact-active-class=""
					>
						{{ item.label }}
					</router-link>

					<div v-else class="ve-sidebar-group">
						<div class="ve-sidebar-group-label">
							{{ item.label }}
						</div>
						<router-link
							v-for="child in item.children"
							:key="child.name"
							:to="child.path"
							class="ve-sidebar-link ve-sidebar-link--child"
							:class="{ 've-sidebar-link--active': child.name === route.name }"
							active-class=""
							exact-active-class=""
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

				<div class="ve-search-wrap">
					<input
						v-model="globalSearch"
						class="ve-search"
						type="text"
						placeholder="Search vendors, schools, items, kits..."
						@input="onSearchInput"
						@focus="globalSearch.trim().length >= 2 && (showResults = true)"
						@blur="hideResultsSoon"
					/>

					<div v-if="showResults" class="ve-search-results">
						<div v-if="searching" class="ve-search-empty">Searching...</div>
						<template v-else-if="searchResults.length">
							<div
								v-for="result in searchResults"
								:key="`${result.type}-${result.id}`"
								class="ve-search-result-item"
								@mousedown.prevent="openResult(result)"
							>
								<span class="ve-search-result-type">{{ result.type }}</span>
								<span class="ve-search-result-label">{{ result.label }}</span>
							</div>
						</template>
						<div v-else class="ve-search-empty">No matches found.</div>
					</div>
				</div>

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
