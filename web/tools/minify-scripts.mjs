/* Strip the prose out of the shipped scripts.
 *
 * public/scripts/ is copied into dist/ as written, and site.js is written to be
 * read: most of its 64 kB is the reasoning behind each behaviour, which belongs
 * in the repository and is of no use to a visitor's phone. Shipped verbatim it
 * came to 18.9 kB gzipped against a 20 kB budget, so every fix was a negotiation
 * with the ceiling rather than with the problem.
 *
 * Whitespace and syntax only — identifiers keep their names, so a stack trace
 * from the live site still reads as the source does. Runs after `astro build`
 * and before budget.mjs, so the budget measures what is actually served.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { transformSync } from "esbuild";

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist", "scripts");
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

for (const name of readdirSync(DIR).filter((f) => f.endsWith(".js"))) {
  const path = join(DIR, name);
  const source = readFileSync(path, "utf8");
  /* es2019: nothing newer is written here, and the target keeps esbuild from
     rewriting what is there into syntax an older Safari cannot parse. */
  const { code } = transformSync(source, {
    loader: "js",
    target: "es2019",
    minifyWhitespace: true,
    minifySyntax: true,
    legalComments: "none",
  });
  writeFileSync(path, code);
  console.log(`[minify] ${name}  ${kb(gzipSync(source).length)} → ${kb(gzipSync(code).length)} gzipped`);
}
