<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BaseWidget from "../components/BaseWidget.vue";
import { showToast } from "../components/toast/useToast";

const router = useRouter();
const stateFilter = ref("Bihar");

const kitsSent = 1568;
const kitsPending = 773;
const dispatchedPercent = Math.round((kitsSent / (kitsSent + kitsPending)) * 100);

const radius = 60;
const circumference = 2 * Math.PI * radius;
const dispatchedDash = computed(() => (dispatchedPercent / 100) * circumference);

const schools = [
	{ name: "Govt Middle School, Gaya", state: "Bihar", kits: 150, date: "10 Oct 2026", confirmed: true, action: "Delivered & Signed" },
	{ name: "Patna Girls Senior Academy", state: "Bihar", kits: 320, date: "11 Oct 2026", confirmed: true, action: "Delivered & Signed" },
	{ name: "Nalanda Education Center", state: "Bihar", kits: 210, date: "12 Oct 2026", confirmed: false, action: "Awaiting Receipt Copy" },
	{ name: "Muzaffarpur Girls High", state: "Bihar", kits: 180, date: "12 Oct 2026", confirmed: true, action: "Delivered & Signed" },
	{ name: "Darvanga Primary Block B", state: "Bihar", kits: 90, date: "14 Oct 2026", confirmed: false, action: "Awaiting Truck Dispatch" },
	{ name: "Rohtas Secondary Vidyalaya", state: "Bihar", kits: 220, date: "15 Oct 2026", confirmed: false, action: "Transit Delayed (Weather)" },
];

function downloadReport() {
	showToast({ message: "Report download isn't wired up yet.", variant: "warning" });
}

function viewDiscrepancyLog() {
	router.push({ name: "dispatch" });
}
</script>

<template>
	<div class="ve-view">
		<div class="ve-view-header">
			<h2>Dispatch & Delivery Status</h2>
		</div>

		<BaseWidget>
			<div class="ve-toolbar">
				<select v-model="stateFilter" class="ve-field-input" style="max-width: 160px">
					<option>Bihar</option>
				</select>
				<span class="ve-pill">Last 90 Days</span>
				<div class="ve-toolbar-spacer" />
				<button class="ve-button ve-button--primary" @click="downloadReport">Download Report</button>
			</div>
		</BaseWidget>

		<BaseWidget>
			<template #header>
				<h2 class="ve-widget-title">Dispatch Coverage & Performance Tracker</h2>
			</template>

			<div class="ve-donut-layout">
				<svg viewBox="0 0 160 160" class="ve-donut">
					<circle cx="80" cy="80" :r="radius" class="ve-donut-track" />
					<circle
						cx="80"
						cy="80"
						:r="radius"
						class="ve-donut-fill"
						:stroke-dasharray="`${dispatchedDash} ${circumference}`"
						transform="rotate(-90 80 80)"
					/>
					<text x="80" y="76" class="ve-donut-percent">{{ dispatchedPercent }}%</text>
					<text x="80" y="94" class="ve-donut-label">DISPATCHED</text>
				</svg>

				<div class="ve-donut-legend">
					<div class="ve-donut-legend-item">
						<span class="ve-donut-swatch ve-donut-swatch--primary" />
						Kits Sent Successfully: <strong>{{ kitsSent.toLocaleString("en-IN") }} Kits</strong>
					</div>
					<div class="ve-donut-legend-item">
						<span class="ve-donut-swatch ve-donut-swatch--muted" />
						Pending Delivery: <strong>{{ kitsPending.toLocaleString("en-IN") }} Kits</strong>
					</div>
					<p class="ve-subtitle" style="margin-top: 0.5rem">
						Coverage calculated against primary state-funded schools in Bihar
						district for this quarter's target achievement.
					</p>
				</div>
			</div>
		</BaseWidget>

		<BaseWidget>
			<div class="ve-table-wrapper">
				<table class="ve-data-table">
					<thead>
						<tr>
							<th>School Name</th>
							<th>State</th>
							<th>Kits Sent</th>
							<th>Delivery Date</th>
							<th>Confirmed Status</th>
							<th>Follow-up Action</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="s in schools" :key="s.name">
							<td>{{ s.name }}</td>
							<td>{{ s.state }}</td>
							<td>{{ s.kits }}</td>
							<td>{{ s.date }}</td>
							<td>
								<span
									class="ve-status-text"
									:class="`ve-status-text--${s.confirmed ? 'active' : 'inactive'}`"
								>
									{{ s.confirmed ? "✓ Confirmed" : "✕ Pending" }}
								</span>
							</td>
							<td>{{ s.action }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="ve-form-actions" style="margin-top: 1rem">
				<button class="ve-outline-button" @click="viewDiscrepancyLog">
					View Delivery Discrepancy Log →
				</button>
			</div>
		</BaseWidget>
	</div>
</template>
