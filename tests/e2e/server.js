// Runs the server-side fixtures (vision_empower/tests/e2e_fixtures.py) either
// through a local bench, or over HTTP when VE_API_KEY/VE_API_SECRET are set
// (cloud sites, where there is no bench CLI to shell into).
const path = require("path");
const { execFileSync } = require("child_process");

const STATE_DIR = path.join(__dirname, ".state");
const BENCH_DIR = process.env.VE_BENCH_DIR || path.resolve(__dirname, "../../../..");
const SITE = process.env.VE_SITE || "vision.local";
const BASE_URL = process.env.VE_BASE_URL || "http://vision.local:8000";
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
	const line = out.trim().split("\n").reverse().find((l) => l.startsWith("{"));
	if (!line) throw new Error(`bench execute ${fn} returned no JSON:\n${out}`);
	return JSON.parse(line);
}

async function viaHttp(fn) {
	const res = await fetch(`${BASE_URL}/api/method/${methodPath(fn)}`, {
		method: "POST",
		headers: { Authorization: `token ${process.env.VE_API_KEY}:${process.env.VE_API_SECRET}` },
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(`${fn} over HTTP failed (${res.status}): ${JSON.stringify(body)}`);
	return body.message;
}

const runFixture = (fn) => (process.env.VE_API_KEY ? viaHttp(fn) : viaBench(fn));

const authFile = (role) => path.join(STATE_DIR, `${role}.json`);

module.exports = { runFixture, STATE_DIR, authFile, BASE_URL };
