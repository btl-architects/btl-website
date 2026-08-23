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

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion: "2024-10-01",
  // The CDN serves a cached copy that can lag a publish by a few seconds. A
  // build should see exactly what the editor just published, so it is off.
  useCdn: false,
});

const builder = imageUrlBuilder(sanity);

/** Sanity's own URL builder — it understands the hotspot, so a derived crop
 *  keeps the subject the editor marked in frame. */
export const urlFor = (source: SanityImageSource) => builder.image(source);
