/* Image resolution — the single seam between content and markup.
 *
 * Nothing in the codebase builds an image URL. Pages hand a SiteImage to
 * <Figure>, Figure asks this module to resolve it, and this module is the only
 * thing that knows where the bytes actually live. That matters because the
 * source is about to change: today it is a pre-encoded webp ladder written by
 * the prototype's build script, and shortly it is Sanity's image CDN, which
 * takes the same job (one asset, many widths) and does it with URL parameters
 * instead of files on disk.
 *
 * Keeping that behind one function is what makes the CMS migration a swap
 * rather than a rewrite — every route, component and template above this line
 * is already written against the shape it will have afterwards. The
 * implementation contract forbids a second image pipeline (§1); this is how
 * there stays only one.
 */

import manifest from "./manifest.json";

/** What a route asks for: an image, not a URL. */
export interface SiteImage {
  /** Manifest key today, Sanity asset id after the migration. */
  key: string;
  /** Required — enforced at the schema level once content moves to the CMS. */
  alt: string;
  caption?: string;
  credit?: string;
  /** Licence provenance. Publishing is blocked without it (contract §3). */
  rights?: string;
}

/** What <Figure> needs to render, and nothing more. */
export interface ResolvedImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
  ratio: number;
}

interface ManifestRung { w: number; file: string }
interface ManifestEntry { w: number; h: number; ratio: number; sizes: ManifestRung[] }

const entries = manifest as unknown as Record<string, ManifestEntry>;

/** Public path prefix. Assets are served from /assets, wherever they came from. */
const BASE = "/assets/";

export function resolveImage(key: string): ResolvedImage | null {
  const entry = entries[key];
  if (!entry || !entry.sizes?.length) return null;

  const srcset = entry.sizes.map((s) => `${BASE}${s.file} ${s.w}w`).join(", ");
  // The fallback is a middle rung, not the largest. A browser that ignores
  // srcset should get something reasonable, not the 2400px original.
  const fallback = entry.sizes[Math.floor(entry.sizes.length / 2)];

  return {
    src: `${BASE}${fallback!.file}`,
    srcset,
    width: entry.w,
    height: entry.h,
    ratio: entry.ratio,
  };
}

/** Build-time guard: a missing image is a content bug, and should be loud. */
export function requireImage(key: string): ResolvedImage {
  const r = resolveImage(key);
  if (!r) throw new Error(`[media] no image for key "${key}" — check the manifest`);
  return r;
}
