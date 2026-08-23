/* Image resolution — the single seam between content and markup.
 *
 * Nothing in the codebase builds an image URL. Pages hand a SiteImage to
 * <Figure>, Figure asks this module to resolve it, and this module is the only
 * thing that knows where the bytes actually live.
 *
 * That seam has now earned itself: the source used to be a pre-encoded webp
 * ladder written by the prototype's build script, and it is now Sanity's image
 * CDN, which does the same job with URL parameters instead of files on disk.
 * The swap happened entirely inside this file — no route, component or template
 * changed, because none of them ever knew where an image came from.
 *
 * The implementation contract forbids a second image pipeline (§1); this is how
 * there stays only one.
 */

import { urlFor } from "./sanity";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

/** What a route asks for: an image, not a URL. */
export interface SiteImage {
  /** The Sanity image object — asset reference plus hotspot. */
  source?: SanityImageSource;
  /* A static brand asset shipped with the site rather than authored in the CMS.
   *
   * The logo is chrome, not content: nobody should be able to change the
   * practice's mark from an editing interface, and it has no alt text worth
   * varying. It still renders through <Figure> so that "one <img> in the
   * codebase" stays literally true rather than nearly true. */
  static?: { src: string; srcset?: string; width: number; height: number };
  /** Required, and required at the schema level too. */
  alt: string;
  caption?: string;
  credit?: string;
  /** Licence provenance. Publishing is blocked without it (contract §3). */
  rights?: string;
  /** Intrinsic size, parsed from the asset id so nothing reflows while loading. */
  width?: number;
  height?: number;
}

export interface ResolvedImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
  ratio: number;
}

/* The widths a photograph is offered at. Sanity generates each on demand and
 * caches it, so this is a menu rather than a build cost — but it is still a
 * finite menu, because an unbounded one means a cold render on unusual
 * viewports. */
const LADDER = [480, 768, 1024, 1440, 1920, 2400];

/** Sanity encodes the original's dimensions in the asset id:
 *  `image-<hash>-3000x2000-jpg`. Reading them here avoids a second round trip
 *  just to learn the aspect ratio. */
function intrinsic(source: SanityImageSource): { w: number; h: number } | null {
  const ref =
    typeof source === "string"
      ? source
      : (source as any)?.asset?._ref ?? (source as any)?._ref ?? null;
  if (typeof ref !== "string") return null;
  const m = ref.match(/-(\d+)x(\d+)-[a-z]+$/i);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

export function resolveImage(image: SiteImage): ResolvedImage | null {
  if (image?.static) {
    const { src, srcset, width, height } = image.static;
    return { src, srcset: srcset ?? `${src} ${width}w`, width, height,
             ratio: Number((width / height).toFixed(4)) };
  }
  const source = image?.source;
  if (!source) return null;
  const dims = intrinsic(source) ?? { w: image.width ?? 1600, h: image.height ?? 1067 };

  // Never offer a width larger than the original — upscaling costs bytes and
  // buys nothing.
  const widths = LADDER.filter((w) => w <= dims.w * 1.1);
  if (widths.length === 0) widths.push(Math.min(dims.w, LADDER[0]!));

  const at = (w: number) =>
    urlFor(source).width(w).quality(76).auto("format").fit("max").url();

  const srcset = widths.map((w) => `${at(w)} ${w}w`).join(", ");
  const fallback = widths[Math.floor(widths.length / 2)]!;

  return {
    src: at(fallback),
    srcset,
    width: dims.w,
    height: dims.h,
    ratio: Number((dims.w / dims.h).toFixed(4)),
  };
}

/** Build-time guard: a missing image is a content bug, and should be loud. */
export function requireImage(image: SiteImage): ResolvedImage {
  const r = resolveImage(image);
  if (!r) throw new Error(`[media] could not resolve image "${image?.alt ?? "unknown"}"`);
  return r;
}


/* --- brand assets ---------------------------------------------------------
   Not content. These live with the code because they are the identity, and an
   identity that can be swapped from a CMS is not one. */

export const LOGO_WHITE: SiteImage = {
  static: {
    src: "/assets/img/logo-white-280.webp",
    srcset: "/assets/img/logo-white-140.webp 140w, /assets/img/logo-white-280.webp 280w",
    width: 4134,
    height: 3117,
  },
  alt: "btl architects",
};
