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
  /** A ~550-byte base64 preview, shown while the real photograph loads. */
  lqip?: string;
  /** Stated by the CMS rather than inferred from the asset id. */
  dimensions?: { width: number; height: number };
  /** Fallback intrinsic size. */
  width?: number;
  height?: number;
}

export interface ResolvedImage {
  src: string;
  srcset: string;
  width: number;
  height: number;
  ratio: number;
  /** Inline base64 preview, if the CMS has one. */
  lqip?: string;
}

/* The widths a photograph is offered at.
 *
 * Sanity generates each width the first time it is asked for, which costs
 * roughly half a second, and caches it afterwards. Every extra rung is
 * therefore another cold generation that some unlucky visitor pays for, and
 * six rungs across four projects is a hundred and sixty-odd first requests.
 * Four rungs cover every real viewport at sensible density and quarter the
 * number of images that have to exist. */
const LADDER = [480, 900, 1400, 2000];

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

/* Sanity's image pipeline cannot transform an SVG — asking it for a width
 * returns the file untouched — and a vector needs no ladder anyway. Publication
 * wordmarks are the case that matters here: served whole, at whatever size the
 * layout asks for, at a few kilobytes. */
function isSvg(source: unknown): boolean {
  const ref = typeof source === "string" ? source
    : (source as any)?.asset?._ref ?? (source as any)?._ref ?? "";
  return typeof ref === "string" && ref.endsWith("-svg");
}

export function resolveImage(image: SiteImage): ResolvedImage | null {
  if (image?.static) {
    const { src, srcset, width, height } = image.static;
    return { src, srcset: srcset ?? `${src} ${width}w`, width, height,
             ratio: Number((width / height).toFixed(4)) };
  }
  const source = image?.source;
  if (!source) return null;

  if (isSvg(source)) {
    // No srcset at all: a vector has one file and every width descriptor would
    // point at the same bytes. (The first attempt emitted a "1x" candidate,
    // which the build's own srcset check rejected — correctly, since srcset
    // width descriptors are what `sizes` is resolved against.)
    return { src: urlFor(source).url(), srcset: "", width: 0, height: 0, ratio: 0 };
  }
  const dims = image.dimensions
    ? { w: image.dimensions.width, h: image.dimensions.height }
    : intrinsic(source) ?? { w: image.width ?? 1600, h: image.height ?? 1067 };

  // Never offer a width larger than the original — upscaling costs bytes and
  // buys nothing.
  const widths = LADDER.filter((w) => w <= dims.w * 1.1);
  if (widths.length === 0) widths.push(Math.min(dims.w, LADDER[0]!));

  /* q=68 rather than the 76 this started at. Measured on a 1400px frame of the
   * Nelly House exterior: 336 kB against 394 kB, for a difference no one has
   * ever spotted in a photograph at this size. auto("format") hands WebP to
   * browsers that take it, which is worth a further 5% — less than it sounds,
   * because Sanity's JPEG encoder is already good. */
  /* Commas are escaped because srcset separates its candidates with commas.
   *
   * A cropped image gets `?rect=106,115,748,947` from Sanity, and the moment
   * that lands in a srcset the browser reads "rect=106" as one candidate and
   * "115" as the next — the whole list is mangled and the image fails to load
   * with no error anywhere. It only bites images that have a crop, which is why
   * exactly one photograph on the site broke and the rest were fine.
   *
   * %2C is a legal encoding of a comma in a query value and Sanity accepts it. */
  const at = (w: number) =>
    urlFor(source).width(w).quality(68).auto("format").fit("max").url()
      .replace(/,/g, "%2C");

  const srcset = widths.map((w) => `${at(w)} ${w}w`).join(", ");
  const fallback = widths[Math.floor(widths.length / 2)]!;

  return {
    src: at(fallback),
    srcset,
    width: dims.w,
    height: dims.h,
    ratio: Number((dims.w / dims.h).toFixed(4)),
    lqip: image.lqip,
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
