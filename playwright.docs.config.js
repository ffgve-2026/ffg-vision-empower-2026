// Regenerates the user-guide screenshots (docs/user-guide/images/) from a
// realistic demo dataset — see docs/user-guide/capture/README.md.
const { defineConfig, devices } = require("@playwright/test");
const { BASE_URL } = require("./tests/e2e/server");

process.env.VE_FIXTURES = "vision_empower.tests.demo_fixtures.setup";

const host = new URL(BASE_URL).hostname;
const launchArgs = host.endsWith(".local") ? [`--host-resolver-rules=MAP ${host} 127.0.0.1`] : [];

module.exports = defineConfig({
	testDir: "./docs/user-guide/capture",
	outputDir: "./docs/user-guide/capture/.results",
	workers: 1,
	retries: 0,
	timeout: 60_000,
	expect: { timeout: 15_000 },
	reporter: [["list"]],
	globalSetup: require.resolve("./tests/e2e/global-setup.js"),
	globalTeardown: require.resolve("./tests/e2e/global-teardown.js"),
	use: {
		baseURL: BASE_URL,
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions: { args: launchArgs } } }],
});
