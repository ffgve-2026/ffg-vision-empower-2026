// Removes every E2E record/user. Set E2E_KEEP_DATA=1 to inspect them after a run.
const { runFixture } = require("./server");

module.exports = async () => {
	if (process.env.E2E_KEEP_DATA) return;
	await runFixture("teardown");
};
