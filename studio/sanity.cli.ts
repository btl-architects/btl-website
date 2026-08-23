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
  /* Where the practice actually logs in: btldesigns.sanity.studio.
   *
   * Sanity hosts the studio itself, which matters more than it sounds — it
   * means the editing interface does not depend on the website's deploy, and a
   * broken build never locks the studio out of their own content. */
  studioHost: "btldesigns",
  /* Pinned so a redeploy never prompts, and never lands on a different app. */
  deployment: { appId: "htl1soszxt5077qufyb41eoh" },
});
