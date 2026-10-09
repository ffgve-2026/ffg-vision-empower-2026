// Seeds users + data (vision_empower/tests/e2e_fixtures.py), then logs each
// role in once and saves its session for the specs.
const fs = require("fs");
const path = require("path");
const { request } = require("@playwright/test");
const { runFixture, STATE_DIR, authFile } = require("./server");

module.exports = async (config) => {
	const fixtures = await runFixture("setup");
	fs.mkdirSync(STATE_DIR, { recursive: true });
	fs.writeFileSync(path.join(STATE_DIR, "fixtures.json"), JSON.stringify(fixtures, null, 2));

	const baseURL = config.projects[0].use.baseURL;
	for (const [role, email] of Object.entries(fixtures.users)) {
		const ctx = await request.newContext({ baseURL });
		const res = await ctx.post("/api/method/login", { form: { usr: email, pwd: fixtures.password } });
		if (!res.ok()) throw new Error(`Login failed for ${email}: ${res.status()} ${await res.text()}`);
		await ctx.storageState({ path: authFile(role) });
		await ctx.dispose();
	}
};
