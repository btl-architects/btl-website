import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";
import { structure } from "./structure";

/* The studio the practice actually uses.
 *
 * Two ideas govern every schema in here:
 *
 *  1. Editors get controlled editorial choices, never a free-form page builder.
 *     Creative latitude inside the system, not enough rope to leave it.
 *  2. Layout is never authored. There is no "alignment", no "band height", no
 *     "column span" anywhere in these schemas. Content states facts; the
 *     interface derives the arrangement (design memory P8, P9). That is what
 *     stops the site drifting away from its own design a year from now.
 */
export default defineConfig({
  name: "btl",
  title: "btl architects",

  // Filled in by `sanity init` — see studio/README.md.
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "",
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",

  plugins: [structureTool({ structure })],

  schema: { types: schemaTypes },
});
