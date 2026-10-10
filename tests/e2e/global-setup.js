// Seeds users + data (vision_empower/tests/e2e_fixtures.py), then logs each
// role in once and saves its session for the specs.
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { runFixture, STATE_DIR, authFile, ensureServer } = require("./server");

module.exports = async (config) => {
	// VE_FIXTURES picks the dataset: the test data by default, or the demo
	// data for the user-guide screenshots (see playwright.docs.config.js).
	await ensureServer();
	const fixtures = await runFixture(process.env.VE_FIXTURES || "setup");
	fs.mkdirSync(STATE_DIR, { recursive: true });
	fs.writeFileSync(path.join(STATE_DIR, "fixtures.json"), JSON.stringify(fixtures, null, 2));

	// Log in from inside Chromium, launched like the tests are: its
	// --host-resolver-rules map *.local to 127.0.0.1, which Node's own
	// requests can't see, so e2e.local needs no /etc/hosts entry.
	const { use } = config.projects[0];
	const browser = await chromium.launch(use.launchOptions);
	try {
		for (const [role, email] of Object.entries(fixtures.users)) {
			const ctx = await browser.newContext({ baseURL: use.baseURL });
			const page = await ctx.newPage();
			await page.goto("/login");
			const res = await page.evaluate(
				async ({ usr, pwd }) => {
					const r = await fetch("/api/method/login", {
						method: "POST",
						body: new URLSearchParams({ usr, pwd }),
					});
					return { ok: r.ok, status: r.status, text: await r.text() };
				},
				{ usr: email, pwd: fixtures.password }
			);
			if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status} ${res.text}`);
			await ctx.storageState({ path: authFile(role) });
			await ctx.close();
		}
	} finally {
		await browser.close();
	}
};
