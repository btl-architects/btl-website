import { defineCliConfig } from "sanity/cli";

/* Config for the `sanity` command line — deploying the studio, running
 * migrations, querying the dataset. The ids come from .env rather than being
 * written here, so this file is safe to commit and the same checkout works
 * against a staging dataset without editing code. */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  },
});
