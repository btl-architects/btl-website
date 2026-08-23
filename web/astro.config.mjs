// @ts-check
import { defineConfig } from "astro/config";

// Static output: every route is rendered at build time and served as a file.
// Content changes reach the site through a CMS webhook that triggers a rebuild,
// not through a server rendering on request (implementation contract §1, §4).
export default defineConfig({
  site: "https://btldesigns.in",
  output: "static",
  build: { format: "directory" },
  // The design system is hand-written CSS in one cascade layer order. Astro's
  // default per-component scoping would fragment it, so styles are global and
  // authored as a system — see src/styles/. No CSS framework (contract §1).
  scopedStyleStrategy: "class",
});
