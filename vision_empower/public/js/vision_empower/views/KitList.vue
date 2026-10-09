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
const kits = ref([]);
const loading = ref(false);

const canManage = userHasAnyRole([ROLES.ADMIN]);

const filtered = computed(() => {
    const term = search.value.trim().toLowerCase();

    if (!term) return kits.value;

    return kits.value.filter(
        (k) =>
            k.name.toLowerCase().includes(term) ||
            k.id.toLowerCase().includes(term) ||
            k.code.toLowerCase().includes(term)
    );
});

async function loadKits() {
    loading.value = true;

    try {
        const response = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Kit",
                fields: [
                    "name",
                    "kit_name",
                    "kit_code",
                    "description",
                    "active",
                    "preferred_vendor",
                    "target_school_type",
                ],
                order_by: "creation desc",
                limit_page_length: 100,
            },
        });

        const kitRecords = response.message || [];

        if (!kitRecords.length) {
            kits.value = [];
            return;
        }

        const kitNames = kitRecords.map((kit) => kit.name);

        const kitItemsResponse = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Kit Item",
                fields: [
                    "name",
                    "parent",
                    "item",
                    "quantity",
                    "uom",
                ],
                filters: {
                    parent: ["in", kitNames],
                    parenttype: "Kit",
                },
                parent: "Kit",
                limit_page_length: 500,
            },
        });

        const kitItems = kitItemsResponse.message || [];

        const itemCountByKit = {};

        kitItems.forEach((kitItem) => {
            const parent = kitItem.parent;

            if (!itemCountByKit[parent]) {
                itemCountByKit[parent] = 0;
            }

            itemCountByKit[parent] += 1;
        });

        kits.value = kitRecords.map((kit) => ({
            id: kit.name,
            name: kit.kit_name || kit.kit_code || "-",
            code: kit.kit_code || "-",
            description: kit.description || "-",
            itemCount: itemCountByKit[kit.name] || 0,
            vendor: kit.preferred_vendor || "-",
            schoolType: kit.target_school_type || "-",
            active: kit.active,
        }));
    } catch (error) {
        console.error("Failed to load kits:", error);

        showToast({
            message: "Failed to load kits.",
            variant: "error",
        });
    } finally {
        loading.value = false;
    }
}

onMounted(loadKits);

function openKit(kit) {
    router.push({
        name: "kit-detail",
        params: { kitId: kit.id },
    });
}

function newKit() {
    router.push({
        name: "kit-create",
    });
}
</script>

<template>
    <div class="ve-view">
        <div class="ve-view-header">
            <h2>Kit Master</h2>
        </div>

        <BaseWidget>
            <div class="ve-toolbar">
                <input
                    v-model="search"
                    class="ve-toolbar-search"
                    type="text"
                    placeholder="Search kits by name, ID, code..."
                />

                <div class="ve-toolbar-spacer" />

                <ImportCsvButton v-if="canManage" doctype="Kit" @imported="loadKits" />
                <button
                    v-if="canManage"
                    class="ve-button ve-button--primary"
                    @click="newKit"
                >
                    New Kit
                </button>
            </div>

            <div
                v-if="loading"
                class="ve-pagination-note"
                style="margin-top: 1rem"
            >
                Loading kits...
            </div>

            <div
                v-else
                class="ve-table-wrapper"
                style="margin-top: 1rem"
            >
                <table class="ve-data-table">
                    <thead>
                        <tr>
                            <th>Kit ID</th>
                            <th>Kit Name</th>
                            <th>Kit Code</th>
                            <th>Items Count</th>
                            <th>Preferred Vendor</th>
                            <th>Target School Type</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr
                            v-for="kit in filtered"
                            :key="kit.id"
                            @click="openKit(kit)"
                        >
                            <td>
                                <span class="ve-link">
                                    {{ kit.id }}
                                </span>
                            </td>

                            <td>
                                {{ kit.name }}
                            </td>

                            <td>
                                {{ kit.code }}
                            </td>

                            <td>
                                {{ kit.itemCount }} Items
                            </td>

                            <td>
                                {{ kit.vendor }}
                            </td>

                            <td>
                                <span
                                    v-if="kit.schoolType !== '-'"
                                    class="ve-badge"
                                    :class="`ve-badge--${CATEGORY_BADGE[kit.schoolType] || 'gray'}`"
                                >
                                    {{ kit.schoolType }}
                                </span>
                                <span v-else>-</span>
                            </td>

                            <td>
                                <span
                                    class="ve-status-text"
                                    :class="`ve-status-text--${kit.active ? 'active' : 'inactive'}`"
                                >
                                    {{ kit.active ? "Active" : "Inactive" }}
                                </span>
                            </td>
                        </tr>

                        <tr v-if="filtered.length === 0">
                            <td
                                colspan="7"
                                style="text-align: center"
                            >
                                No kits found.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="ve-pagination-note">
                Showing {{ filtered.length }} of {{ kits.length }} kits
            </div>
        </BaseWidget>
    </div>
</template>
