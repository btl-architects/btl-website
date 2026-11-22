/* Script addresses that change when the script does.
 *
 * The scripts are served from fixed addresses that browsers keep for four
 * hours. After a deploy a returning visitor got the new page with the old
 * script: on 2026-11-23 the old press-reader.js loaded the award's Instagram
 * post but had no code to reveal it, so it sat behind its placeholder for
 * good. A fingerprint of the file's contents in the address means a changed
 * script is a new address, fetched fresh, and an unchanged one stays cached. */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";

const versions = new Map<string, string>();

export function scriptUrl(name: "site.js" | "press-reader.js" | "enquiry.js"): string {
  let v = versions.get(name);
  if (!v) {
    v = createHash("sha256").update(readFileSync(join(process.cwd(), "public", "scripts", name))).digest("hex").slice(0, 12);
    versions.set(name, v);
  }
  return `/scripts/${name}?v=${v}`;
}
