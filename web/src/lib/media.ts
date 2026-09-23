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

  /* Never offer more than the original, and never less than it either.
   *
   * This used to keep the rungs at or under 1.1x the original and stop there,
   * which lost whatever lay between the last rung and the original: a 720px
   * upload was offered at 480 and nothing else, a third of its pixels thrown
   * away before the browser was even asked. The same rule also let a 1280px
   * original be listed as "1400w" — Sanity will not upscale, so the file was
   * 1280 and the browser was told it was sharper than it is.
   *
   * So the rungs below the original are kept, and the top rung is the original
   * itself (capped at the largest rung). */
  const top = Math.min(dims.w, LADDER[LADDER.length - 1]!);
  const widths = LADDER.filter((w) => w < top);
  widths.push(top);

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

/* What a spread photograph is actually going to be, in one place.
 *
 * A spread's picture is height-driven above 60rem: the CSS caps its WIDTH at
 * --spread-max-h times the image's own ratio, or the column, whichever is
 * smaller (see .spread__media img). So its width depends on the shape of the
 * photograph, and the pages were stating a flat "420px" for all of them — true
 * of nothing. The landscape studio picture renders 664px at 1440 and 1107px at
 * 1920, and was being given the 900px file to stretch over both.
 *
 * A constant cannot express that, but `sizes` can: it takes lengths and maths,
 * and the ratio is known at build time. The numbers mirror the two CSS limits
 * exactly; a browser too old for min()/calc here simply assumes 100vw and
 * over-fetches, which is the safe way to be wrong. */
export function spreadSizes(image: SiteImage): string {
  const ratio = resolveImage(image)?.ratio || 1.5;
  const cap = `calc(74svh * ${ratio})`;
  // The cap holds below 60rem too, so a stacked portrait is asked for at the
  // size it is drawn rather than at the full column.
  return `(min-width: 60rem) min(46vw, ${cap}), min(92vw, ${cap})`;
}

/* A photograph cropped to fill a box (object-fit: cover), given the box's width
 * wide (60rem up) and narrow.
 *
 * Cropping to fill scales the image until its SHORT side covers the box, so a
 * landscape photograph in a square is drawn wider than the box by its ratio —
 * a 16:9 portrait of a person in a 256px square is really 455px wide. Asking for
 * the box's width alone under-asks for every landscape upload.
 *
 * Written for the team cards, whose old value, "20rem, 3rem", described a 48px
 * row thumbnail that no longer exists; on a phone it asked for a twentieth of
 * the card and got a sharp picture only because the smallest file offered is
 * 480px. The square is the only shape any caller uses, so the box is square. */
export function coverSizes(image: SiteImage, wide: string, narrow: string): string {
  const k = Math.max(1, resolveImage(image)?.ratio || 1);
  return `(min-width: 60rem) calc(${wide} * ${k}), calc(${narrow} * ${k})`;
}

/* A frame in a rail (RailFrame): a project's gallery or the Studio's photographs.
 *
 * Measured, not guessed. These frames render 335–892 CSS px wide depending on
 * each photograph's aspect, clustering around 750. At 56vw on a 1440px retina
 * screen the browser was told it needed 1612 device pixels and pulled the
 * 2000px file — 822 kB apiece, 5.7 MB for a seven-frame project.
 *
 * 700px asks for 1400 device pixels on a retina screen, which lands exactly on
 * the 1400px rung: 394 kB, and 1.6–1.8x density over the rendered size, which
 * for a photograph is indistinguishable from 2x. Half the bytes, same picture.
 * An opened project card hands this to its kept thumbnails too (site.js). */
export const RAIL_SIZES = "700px";

/* The one image nobody on the site ever sees.
 *
 * A shared link is the practice's front door far more often than the home page
 * is — somebody sends btldesigns.in on WhatsApp and what arrives is either a
 * photograph of a building or a grey rectangle with a sentence in it. Until
 * now it was the rectangle, on every page.
 *
 * Fixed 1200x630 because that is what the platforms crop to anyway, and doing
 * it here means the hotspot an editor set in the Studio decides what survives
 * the crop rather than the centre of the frame deciding for them. fit=crop
 * instead of the ladder's fit=max for the same reason: this is the one place a
 * photograph should be cut to a shape rather than fitted into one.
 *
 * Quality 80 rather than 68 — it is fetched once by a scraper and cached by the
 * platform forever, so the usual argument about a visitor's data plan does not
 * apply, and WhatsApp re-compresses hard on top of whatever it is given.
 *
 * No comma escaping needed: this URL never enters a srcset. */
export function socialImage(image: SiteImage | null | undefined): string | null {
  const source = image?.source;
  if (!source || isSvg(source)) return null;
  return urlFor(source)
    .width(1200)
    .height(630)
    .fit("crop")
    .crop("focalpoint")
    .quality(80)
    .auto("format")
    .url();
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
