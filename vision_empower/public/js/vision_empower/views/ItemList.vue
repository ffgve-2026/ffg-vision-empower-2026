<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import ImportCsvButton from "../components/ImportCsvButton.vue";
import { showToast } from "../components/toast/useToast";
import { CATEGORY_BADGE } from "../config/masterDataMock";
import { ROLES, userHasAnyRole } from "../config/roles";

const router = useRouter();

const search = ref("");
const categoryFilter = ref("");
const items = ref([]);
const loading = ref(false);

const canManage = userHasAnyRole([ROLES.ADMIN]);

const categories = computed(() =>
    [...new Set(items.value.map((i) => i.category).filter(Boolean))].sort()
);

const filtered = computed(() =>
    items.value.filter((i) => {
        const term = search.value.trim().toLowerCase();

        const matchesSearch =
            !term ||
            i.name.toLowerCase().includes(term) ||
            i.id.toLowerCase().includes(term);

        const matchesCategory =
            !categoryFilter.value ||
            i.category === categoryFilter.value;

        return matchesSearch && matchesCategory;
    })
);

async function loadItems() {
    loading.value = true;

    try {
        const response = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Item",
                fields: [
                    "name",
                    "item_name",
                    "category",
                    "unit",
                    "school_norm_qty",
                    "active",
                ],
                order_by: "creation desc",
                limit_page_length: 100,
            },
        });

        items.value = (response.message || []).map((item) => ({
            id: item.name,
            name: item.item_name || "-",
            category: item.category || "-",
            unit: item.unit || "-",
            vendor: "-",
            norm: item.school_norm_qty ?? 0,
            price: "-",
            active: item.active,
        }));
    } catch (error) {
        console.error("Failed to load items:", error);

        showToast({
            message: "Failed to load items.",
            variant: "error",
        });
    } finally {
        loading.value = false;
    }
}

onMounted(loadItems);

function openItem(item) {
    router.push({
        name: "item-detail",
        params: { itemId: item.id },
    });
}

function newItem() {
    router.push({ name: "item-create" });
}


</script>

<template>
    <div class="ve-view">
        <div class="ve-view-header">
            <h2>Item Master</h2>
        </div>

        <BaseWidget>
            <div class="ve-toolbar">
                <input
                    v-model="search"
                    class="ve-toolbar-search"
                    type="text"
                    placeholder="Search items by name, ID..."
                />

                <select
                    v-model="categoryFilter"
                    class="ve-field-input"
                    style="max-width: 180px"
                >
                    <option value="">Category: All Categories</option>

                    <option
                        v-for="c in categories"
                        :key="c"
                        :value="c"
                    >
                        {{ c }}
                    </option>
                </select>

                <div class="ve-toolbar-spacer" />

                <!-- Wraps as one group, right-aligned, when the row is full. -->
                <div class="ve-toolbar-actions">
                    <ImportCsvButton v-if="canManage" doctype="Item" @imported="loadItems" />
                    <button
                        v-if="canManage"
                        class="ve-button ve-button--primary"
                        @click="newItem"
                    >
                        New Item
                    </button>
                </div>
            </div>

            <div
                v-if="loading"
                class="ve-pagination-note"
                style="margin-top: 1rem"
            >
                Loading items...
            </div>

            <div
                v-else
                class="ve-table-wrapper"
                style="margin-top: 1rem"
            >
                <table class="ve-data-table">
                    <thead>
                        <tr>
                            <th>Item ID</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Unit</th>
                            <th>Linked Vendor(s)</th>
                            <th>School Norm Qty</th>
                            <th>Unit Price</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr
                            v-for="item in filtered"
                            :key="item.id"
                        >

                            <td @click="openItem(item)">
                                <span class="ve-link">
                                    {{ item.id }}
                                </span>
                            </td>

                            <td @click="openItem(item)">
                                {{ item.name }}
                            </td>

                            <td @click="openItem(item)">
                                <span
                                    class="ve-badge"
                                    :class="`ve-badge--${
                                        CATEGORY_BADGE[item.category] || 'gray'
                                    }`"
                                >
                                    {{ item.category }}
                                </span>
                            </td>

                            <td @click="openItem(item)">
                                {{ item.unit }}
                            </td>

                            <td @click="openItem(item)">
                                {{ item.vendor }}
                            </td>

                            <td @click="openItem(item)">
                                {{ item.norm }}
                            </td>

                            <td @click="openItem(item)">
                                {{ item.price }}
                            </td>
                        </tr>

                        <tr v-if="filtered.length === 0">
                            <td
                                colspan="7"
                                style="text-align: center"
                            >
                                No items found.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="ve-pagination-note">
                Showing {{ filtered.length }} of {{ items.length }} items
            </div>
        </BaseWidget>
    </div>
</template>
