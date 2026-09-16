<script setup>
import { ref, onMounted } from "vue";

const items = ref([]);
const loading = ref(true);

async function loadTestItems() {
    loading.value = true;

    try {
        const response = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Test Item",
                fields: ["name", "description"],
                limit_page_length: 10,
                order_by: "modified desc",
            },
        });

        items.value = response.message || [];
    } finally {
        loading.value = false;
    }
}

function viewAllItems() {
    frappe.set_route("List", "Test Item");
}

function openFrappePage() {
    frappe.set_route("test-frappe-page");
}

onMounted(() => {
    loadTestItems();
});
</script>

<template>
    <div class="container-fluid">

        <div class="mb-4">
            <h2>Hello, Vision Empower! From Custom Vue</h2>

            <p class="text-muted">
                Welcome to the Vision Empower application.
            </p>
        </div>

        <!-- KPI -->
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body">
                        <div class="text-muted">
                            Test Items
                        </div>

                        <div
                            style="
                                font-size: 28px;
                                font-weight: 600;
                            "
                        >
                            {{ items.length }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Items -->
        <div class="card">
            <div class="card-body">

                <h4>Recent Test Items</h4>

                <div v-if="loading">
                    Loading...
                </div>

                <div v-else-if="items.length === 0">
                    <p class="text-muted">
                        No Test Items found.
                    </p>
                </div>

                <div v-else>
                    <div
                        v-for="item in items"
                        :key="item.name"
                        class="py-2 border-bottom"
                    >
                        <strong>
                            {{ item.name }}
                        </strong>

                        <div class="text-muted">
                            {{ item.description }}
                        </div>
                    </div>
                </div>

                <div class="mt-3">
                    <button
                        class="btn btn-primary"
                        @click="viewAllItems"
                    >
                        View All Test Items
                    </button>
                </div>

                <Button @click="openFrappePage">
                    Open Frappe Page
                </Button>

            </div>
        </div>

    </div>
</template>
