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

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const copy = fileURLToPath(new URL("../.test-dist/", import.meta.url));

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

const args = ["wrangler", "pages", "dev", copy, "--compatibility-date", "2026-09-20", "--ip", "127.0.0.1", "--port", "8788"];
const child = spawn("npx", args, { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
