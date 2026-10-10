// Runs the server-side fixtures (vision_empower/tests/e2e_fixtures.py) either
// through a local bench, or over HTTP when VE_API_KEY/VE_API_SECRET are set
// (cloud sites, where there is no bench CLI to shell into).
const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFileSync, spawn } = require("child_process");

const STATE_DIR = path.join(__dirname, ".state");
const BENCH_DIR = process.env.VE_BENCH_DIR || path.resolve(__dirname, "../../../..");
// A dedicated test site by default: setup/teardown create and delete E2E
// records, which mustn't mix with the data you use by hand on vision.local.
// It gets its own dev server on 8001, since `bench serve` (port 8000)
// only serves the bench's default site.
const SITE = process.env.VE_SITE || "e2e.local";
const BASE_URL = process.env.VE_BASE_URL || "http://e2e.local:8001";
const MODULE = "vision_empower.tests.e2e_fixtures";

// `fn` is a function in e2e_fixtures ("setup"), or a full dotted path to
// one elsewhere ("vision_empower.tests.demo_fixtures.setup").
const methodPath = (fn) => (fn.includes(".") ? fn : `${MODULE}.${fn}`);

function viaBench(fn) {
	const out = execFileSync("bench", ["--site", SITE, "execute", methodPath(fn)], {
		cwd: BENCH_DIR,
		encoding: "utf-8",
		stdio: ["ignore", "pipe", "inherit"],
	});
	const line = out
		.trim()
		.split("\n")
		.reverse()
		.find((l) => l.startsWith("{"));
	if (!line) throw new Error(`bench execute ${fn} returned no JSON:\n${out}`);
	return JSON.parse(line);
}

async function viaHttp(fn) {
	const res = await fetch(`${BASE_URL}/api/method/${methodPath(fn)}`, {
		method: "POST",
		headers: { Authorization: `token ${process.env.VE_API_KEY}:${process.env.VE_API_SECRET}` },
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(`${fn} over HTTP failed (${res.status}): ${JSON.stringify(body)}`);
	return body.message;
}

const runFixture = (fn) => (process.env.VE_API_KEY ? viaHttp(fn) : viaBench(fn));

const authFile = (role) => path.join(STATE_DIR, `${role}.json`);

// --- the test site's own dev server (local mode only) ----------------------

const SERVER_PID = path.join(STATE_DIR, "server.pid");
const url = new URL(BASE_URL);
const isLocal = url.hostname.endsWith(".local") || url.hostname === "localhost";
const port = Number(url.port) || 80;

// Is anything answering on the port? (127.0.0.1 directly: Node can't
// resolve *.local the way the pinned browser does.)
const ping = () =>
	new Promise((resolve) => {
		const req = http.get(
			{ host: "127.0.0.1", port, path: "/api/method/ping", timeout: 3000 },
			(res) => {
				res.resume();
				resolve(res.statusCode === 200);
			}
		);
		req.on("error", () => resolve(false));
		req.on("timeout", () => req.destroy());
	});

// Starts `bench --site <SITE> serve --port <port>` unless something is
// already serving there (e.g. you started it yourself). Stopped again by
// stopServer() in global teardown; its output goes to .state/server.log.
async function ensureServer() {
	if (process.env.VE_API_KEY || !isLocal || (await ping())) return;
	fs.mkdirSync(STATE_DIR, { recursive: true });
	const log = fs.openSync(path.join(STATE_DIR, "server.log"), "a");
	const child = spawn("bench", ["--site", SITE, "serve", "--port", String(port)], {
		cwd: BENCH_DIR,
		detached: true,
		stdio: ["ignore", log, log],
	});
	child.unref();
	fs.writeFileSync(SERVER_PID, String(child.pid));
	for (let i = 0; i < 60; i++) {
		if (await ping()) return;
		await new Promise((r) => setTimeout(r, 1000));
	}
	stopServer();
	throw new Error(
		`The ${SITE} server didn't start on port ${port} — see tests/e2e/.state/server.log`
	);
}

function stopServer() {
	if (!fs.existsSync(SERVER_PID)) return;
	const pid = Number(fs.readFileSync(SERVER_PID, "utf-8"));
	fs.unlinkSync(SERVER_PID);
	try {
		process.kill(-pid); // the whole process group: bench and its python child
	} catch (e) {
		// Already gone.
	}
}

module.exports = { runFixture, STATE_DIR, authFile, BASE_URL, ensureServer, stopServer };
