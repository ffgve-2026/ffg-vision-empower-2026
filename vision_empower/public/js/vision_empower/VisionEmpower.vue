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
const searchFailed = ref(false);
const showResults = ref(false);
let searchDebounce = null;

// What the top-bar search looks in. `match` are the fields a term is
// matched against (any of them), `label` is what the result shows, and
// `to` is where clicking it goes.
const SEARCH_SOURCES = [
	{
		type: "Vendor",
		doctype: "Vendor",
		match: ["name", "vendor_name"],
		label: (r) => r.vendor_name,
		to: (r) => ({ name: "vendor-detail", params: { vendorId: r.name } }),
	},
	{
		type: "School",
		doctype: "School",
		match: ["name", "school_name"],
		label: (r) => r.school_name,
		to: (r) => ({ name: "school-detail", params: { schoolId: r.name } }),
	},
	{
		type: "Item",
		doctype: "Item",
		match: ["name", "item_name"],
		label: (r) => r.item_name,
		to: (r) => ({ name: "item-detail", params: { itemId: r.name } }),
	},
	{
		type: "Kit",
		doctype: "Kit",
		match: ["name", "kit_name", "kit_code"],
		label: (r) => r.kit_name,
		to: (r) => ({ name: "kit-detail", params: { kitId: r.name } }),
	},
	{
		type: "PR",
		doctype: "Procurement Requisition",
		match: ["name"],
		fields: ["workflow_stage"],
		label: (r) => `${r.name} · ${r.workflow_stage}`,
		to: (r) => ({ name: "procurement-status", params: { prId: r.name } }),
	},
	{
		type: "Purchase Order",
		doctype: "VE Purchase Order",
		match: ["name"],
		fields: ["pr_ids"],
		label: (r) => `${r.name} · ${r.pr_ids}`,
		to: (r) => ({ name: "procurement-status", params: { prId: r.pr_ids } }),
	},
	{
		type: "Delivery Challan",
		doctype: "Delivery Challan",
		match: ["name", "lr_docket_no"],
		fields: ["procurement_requisition"],
		label: (r) => `${r.name} · ${r.procurement_requisition}`,
		to: (r) => ({ name: "procurement-status", params: { prId: r.procurement_requisition } }),
	},
	{
		type: "Transfer",
		doctype: "Location Transfer",
		match: ["name"],
		fields: ["status"],
		label: (r) => `${r.name} · ${r.status}`,
		to: (r) => ({ name: "location-transfer-detail", params: { transferId: r.name } }),
	},
];

async function runSearch(term) {
	searching.value = true;
	searchFailed.value = false;

	try {
		const resultSets = await Promise.all(
			SEARCH_SOURCES.map((source) =>
				frappe
					.call({
						method: "frappe.client.get_list",
						args: {
							doctype: source.doctype,
							fields: [...new Set([...source.match, ...(source.fields || [])])],
							or_filters: source.match.map((field) => [field, "like", `%${term}%`]),
							limit_page_length: 5,
						},
					})
					.then((response) =>
						(response.message || []).map((row) => ({
							key: `${source.doctype}:${row.name}`,
							type: source.type,
							label: source.label(row) || row.name,
							to: source.to(row),
						}))
					)
					.catch(() => {
						searchFailed.value = true;
						return [];
					})
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
	router.push(result.to);
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
						placeholder="Search by name or ID — vendors, schools, items, kits, PRs, POs, DCs..."
						@input="onSearchInput"
						@focus="globalSearch.trim().length >= 2 && (showResults = true)"
						@blur="hideResultsSoon"
					/>

					<div v-if="showResults" class="ve-search-results">
						<div v-if="searching" class="ve-search-empty">Searching...</div>
						<template v-else-if="searchResults.length">
							<div
								v-for="result in searchResults"
								:key="result.key"
								class="ve-search-result-item"
								@mousedown.prevent="openResult(result)"
							>
								<span class="ve-search-result-type">{{ result.type }}</span>
								<span class="ve-search-result-label">{{ result.label }}</span>
							</div>
						</template>
						<div v-else-if="searchFailed" class="ve-search-empty">Search failed — try again.</div>
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
