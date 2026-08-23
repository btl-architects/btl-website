/* The Sanity connection. One client, one place.
 *
 * Reads happen at build time against the public dataset, so no token is
 * involved and none should ever be added here — a token in the front end is a
 * token in the browser. Content reaches the live site by rebuilding, not by the
 * page querying at request time.
 */
import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const projectId = import.meta.env.SANITY_PROJECT_ID ?? process.env.SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET ?? process.env.SANITY_DATASET ?? "production";

if (!projectId) {
  throw new Error(
    "[sanity] SANITY_PROJECT_ID is not set. Copy web/.env.example to web/.env and fill it in.",
  );
}

/* Preview builds.
 *
 * A static site cannot show a draft, because the draft was never built. So
 * preview is a second build of the same code against a different view of the
 * dataset: SANITY_PREVIEW turns on Sanity's `drafts` perspective, which returns
 * the unpublished version of any document that has one, and the published
 * version of everything else.
 *
 * That needs a token, because drafts are not public — and this is the one place
 * in the front end where a secret is involved. It is a **read-only Viewer**
 * token, it exists only in the preview context's environment, and the preview
 * deployment must never be the production site. A preview build with no token
 * falls back to published content rather than failing: the worst case is a
 * preview that shows you what is already live, not a broken deploy.
 */
const previewing = (import.meta.env.SANITY_PREVIEW ?? process.env.SANITY_PREVIEW) === "true";
const previewToken = import.meta.env.SANITY_PREVIEW_TOKEN ?? process.env.SANITY_PREVIEW_TOKEN;
const canPreview = previewing && !!previewToken;

if (previewing && !previewToken) {
  console.warn(
    "[sanity] SANITY_PREVIEW is on but SANITY_PREVIEW_TOKEN is missing — building published content instead.",
  );
}

export const isPreview = canPreview;

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion: "2024-10-01",
  // The CDN serves a cached copy that can lag a publish by a few seconds. A
  // build should see exactly what the editor just published, so it is off.
  useCdn: false,
  ...(canPreview
    ? { token: previewToken, perspective: "drafts" as const }
    : { perspective: "published" as const }),
});

const builder = imageUrlBuilder(sanity);

/** Sanity's own URL builder — it understands the hotspot, so a derived crop
 *  keeps the subject the editor marked in frame. */
export const urlFor = (source: SanityImageSource) => builder.image(source);
