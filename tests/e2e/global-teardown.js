// Removes every E2E record/user, then stops the test site's server if
// global setup started it. Set E2E_KEEP_DATA=1 to inspect the data (and keep
// the server running) after a run.
const { runFixture, stopServer } = require("./server");

module.exports = async () => {
	if (process.env.E2E_KEEP_DATA) return;
	try {
		await runFixture("teardown");
	} finally {
		stopServer();
	}
};
