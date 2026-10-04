/* Serve the build for the browser tests — the real build, minus two lines.
 *
 * Production sends Strict-Transport-Security and a CSP ending in
 * upgrade-insecure-requests. Both are right for btldesigns.in and both mean
 * "never speak plain http to this host". The test server is plain http on
 * 127.0.0.1. Chromium exempts loopback from them; WebKit does not, so every
 * WebKit navigation hung until it timed out — 23 of 23 WebKit tests failed on
 * every push, CI was red permanently, and a real regression would have looked
 * exactly like the failures everyone had learned to ignore.
 *
 * So the tests get a copy of dist/ whose _headers drops exactly those two
 * directives and nothing else: the rest of the security policy is still under
 * test. dist/ itself is never touched, because it is what gets deployed — and
 * site-check.mjs fails the build if production ever loses either directive, so
 * this cannot become the way they quietly disappear. */
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {seedReaderDemo} from "../tests/fixtures/press-reader.mjs";

/* TEST_PORT lets two isolated runs (two checkouts, or a suite beside a manual
 * inspection server) coexist. Each port gets its own copy, so one server can
 * never start serving another's build. 8788 keeps its historical directory. */
const port = String(process.env.TEST_PORT || 8788);
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error(`[serve-test] TEST_PORT must be a port number from 1 to 65535, got ${port}`);
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const copy = fileURLToPath(new URL(port === "8788" ? "../.test-dist/" : `../.test-dist-${port}/`, import.meta.url));

rmSync(copy, { recursive: true, force: true });
cpSync(dist, copy, { recursive: true });

const headers = readFileSync(copy + "_headers", "utf8");
const loopback = headers
  .split("\n")
  .filter((line) => !/^\s*Strict-Transport-Security:/i.test(line))
  .map((line) => line.replace(/;\s*upgrade-insecure-requests\b/i, ""))
  .join("\n");
if (loopback === headers) throw new Error("[serve-test] expected to remove the https-only directives and found none");
writeFileSync(copy + "_headers", loopback);

// Labelled fixtures are added only to the test copy, never dist or Sanity.
await seedReaderDemo(copy);

const state = fileURLToPath(new URL(`../.wrangler/test-${port}/`, import.meta.url));
const args = ["wrangler", "pages", "dev", copy, "--compatibility-date", "2026-09-20", "--ip", "127.0.0.1", "--port", port, "--persist-to", state];
const child = spawn("npx", args, { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
