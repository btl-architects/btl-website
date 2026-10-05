// @ts-check
import { defineConfig } from "astro/config";

// The live domain (connected 5 October 2026). Production also sets SITE_URL; this
// default means a build that lost the variable still names the real address,
// not the old pages.dev host, which now redirects. SITE_URL changes every
// canonical, sitemap and share URL together on rebuild.
const site = new URL(process.env.SITE_URL || "https://btldesigns.in");
if (site.protocol !== "https:" || site.username || site.password || site.pathname !== "/" || site.search || site.hash) {
  throw new Error("SITE_URL must be a public HTTPS origin without a path or credentials.");
}

// Static output: every route is rendered at build time and served as a file.
// Content changes reach the site through a CMS webhook that triggers a rebuild,
// not through a server rendering on request (implementation contract §1, §4).
export default defineConfig({
  site: site.href,
  output: "static",
  build: { format: "directory" },
  // The design system is hand-written CSS in one cascade layer order. Astro's
  // default per-component scoping would fragment it, so styles are global and
  // authored as a system — see src/styles/. No CSS framework (contract §1).
  scopedStyleStrategy: "class",
});
