// Functional UI tests for the Vision Empower SPA — see tests/e2e/README.md.
const { defineConfig, devices } = require("@playwright/test");
const { BASE_URL } = require("./tests/e2e/server");

// A local *.local site: pin it to 127.0.0.1 inside Chromium so a Wi-Fi/VPN
// change can't break name resolution mid-run (macOS mDNS).
const host = new URL(BASE_URL).hostname;
const launchArgs = host.endsWith(".local") ? [`--host-resolver-rules=MAP ${host} 127.0.0.1`] : [];

module.exports = defineConfig({
	testDir: "./tests/e2e",
	outputDir: "./tests/e2e/test-results",
	// Specs share one site's database and walk PRs through a stateful
	// workflow, so they run one at a time.
	workers: 1,
	fullyParallel: false,
	retries: 0,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	reporter: [["list"], ["html", { outputFolder: "tests/e2e/.report", open: "never" }]],
	globalSetup: require.resolve("./tests/e2e/global-setup.js"),
	globalTeardown: require.resolve("./tests/e2e/global-teardown.js"),
	use: {
		baseURL: BASE_URL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], launchOptions: { args: launchArgs } },
		},
	],
});
