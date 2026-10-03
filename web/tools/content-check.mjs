import {clipVideoSources} from "../../shared/video.ts";
import {isSafeSlug} from '../../shared/slug.ts';
/* Check the content against the rules the Studio enforces — at build time.
 *
 * The Studio validates as an editor types. That covers everything typed into
 * the Studio, and nothing else. Content seeded by script, imported, or patched
 * through the API never passes through those rules, so the dataset can drift
 * away from its own schema and the only place it shows up is a red panel that
 * somebody has to happen to open.
 *
 * That is exactly what happened: twenty-four photographs carried kind "full", a
 * value left over from an earlier draft of the design that was never in the
 * schema's list, and four had alt text below the eight-character minimum. The
 * site rendered perfectly the whole time — GROQ does not validate, and the
 * front end only ever branches on kind == "cover" — so nothing was visibly
 * wrong until the client opened the editor and found errors on every project.
 *
 * So the same rules run here, against the real dataset, before anything is
 * built. Studio-side validation is for the person typing; this is for the
 * dataset. Where the two disagree the schema wins, and this file is the place
 * that notices.
 *
 * Kept deliberately literal rather than derived from the schema: importing the
 * Studio's TypeScript into the web build would couple the two packages for the
 * sake of about thirty lines, and a validator you cannot read at a glance is
 * one nobody trusts.
 */
import { client, mode } from "./env.mjs";
import {articleErrors} from "../server/article-validation.js";

// Mirrors studio/schemas/objects.ts. Changing a list there means changing it
// here, and the mismatch this file exists to catch is the reminder.
const KINDS = ["cover", "photograph", "drawing"];
const RIGHTS = ["owned", "client-supplied", "licensed", "publication"];
const ALT_MIN = 8;
const ALT_MAX = 160;

const errors = [];
let figures = 0;
const where = (doc, path) => `${doc} · ${path}`;

/* One figure, wherever it appears. Every image on the site is one of these,
 * which is what makes a single function enough. */
function checkFigure(fig, doc, path) {
  if (!fig) return;
  figures++;
  if (!fig.hasAsset) errors.push(`${where(doc, path)} has no image file`);

  const alt = (fig.alt ?? "").trim();
  if (!alt) errors.push(`${where(doc, path)} has no alt text`);
  else if (alt.length < ALT_MIN)
    errors.push(`${where(doc, path)} alt is ${alt.length} characters, minimum ${ALT_MIN} — "${alt}"`);
  else if (alt.length > ALT_MAX)
    errors.push(`${where(doc, path)} alt is ${alt.length} characters, maximum ${ALT_MAX}`);

  if (!fig.rights) errors.push(`${where(doc, path)} has no licence set`);
  else if (!RIGHTS.includes(fig.rights))
    errors.push(`${where(doc, path)} licence "${fig.rights}" is not one of ${RIGHTS.join(", ")}`);

  // kind only applies to figures inside a project's image list; a portrait or a
  // masthead has no role to play in a project.
  if (fig.checkKind) {
    if (!fig.kind) errors.push(`${where(doc, path)} has no role set`);
    else if (!KINDS.includes(fig.kind))
      errors.push(`${where(doc, path)} role "${fig.kind}" is not one of ${KINDS.join(", ")}`);
  }
}

const data = await client.fetch(`{
  "projects": *[_type == "project" && lifecycle in $states]{
    _id, title, lifecycle, "slug": slug.current,
    "images": images[]{ alt, rights, kind, "hasAsset": defined(asset.asset) }
  },
  "people": *[_type == "person"]{
    _id, name, "portrait": portrait{ alt, rights, "hasAsset": defined(asset.asset) }
  },
  "publications": *[_type == "publication"]{
    _id, kind, publication, openingMode, url, "slug":slug.current,
    "image": image{ alt, rights, "hasAsset": defined(asset.asset) },
    intro, "articleHero": articleHero{alt, rights, "hasAsset": defined(asset.asset)},
    "readerContent": readerContent[]{_type, style, listItem, level, text, children[]{text, marks}, markDefs[]{_type, href}, alt, rights, "hasAsset": defined(asset.asset)}
  },
  "settings": *[_type == "settings"][0]{
    "founders": foundersImage{ alt, rights, "hasAsset": defined(asset.asset) },
    "teamImage": teamImage{ alt, rights, "hasAsset": defined(asset.asset) },
    "studioImage": studioImage{alt, rights, "hasAsset": defined(asset.asset)},
    "studioImages": studioImages[]{alt, rights, "hasAsset": defined(asset.asset)},
    nav[]{label, href}, social[]{label, url},
    heroClips[]{label, videoMode, "video": video.asset->url, "poster": poster.asset->url,
      "videoMux": videoMux.asset->{status, data{playback_ids[]{id,policy},static_renditions{files[]{status,name,ext}}}}}
  }
}`, { states: mode.preview ? ["draft", "published", "archived"] : ["published", "archived"] });

for (const p of data.projects ?? []) {
  const id = p.title || p._id;
  if (!p.slug) errors.push(`${id} has no slug`);
  const imgs = p.images ?? [];
  if (!imgs.length) errors.push(`${id} has no photographs`);
  imgs.forEach((fig, i) => checkFigure({ ...fig, checkKind: true }, id, `photograph ${i + 1}`));

  // The cover is what the home page and the index lead with. Two covers means
  // the choice is made by array order, which is not a choice anyone made.
  const covers = imgs.filter((f) => f.kind === "cover").length;
  if (p.lifecycle === "published" && covers !== 1)
    errors.push(`${id} has ${covers} covers — a published project needs exactly one`);
}

for (const p of data.people ?? []) checkFigure(p.portrait, p.name || p._id, "portrait");
const pressSlugs=new Set();
for (const p of data.publications ?? []) {
  if(!isSafeSlug(p.slug) || pressSlugs.has(p.slug)) errors.push(`${p.publication || p._id} needs a unique valid Press slug`);
  pressSlugs.add(p.slug);
  checkFigure(p.image, p.publication || p._id, "Press image");
  checkFigure(p.articleHero, p.publication || p._id, "article opening photograph");
  const blocks = Array.isArray(p.readerContent) ? p.readerContent : [];
  blocks.forEach((b, i) => {if (b._type === "figure") checkFigure(b, p.publication || p._id, `article image ${i + 1}`);});
  if (p.openingMode && !["reader", "embed", "external"].includes(p.openingMode))
    errors.push(`${p.publication || p._id} has an unknown article opening mode`);
  if (p.openingMode === "reader" && !blocks.some(b => b._type === "figure" ? b.hasAsset : Array.isArray(b.children) && b.children.some(s => typeof s.text === 'string' && s.text.trim())))
    errors.push(`${p.publication || p._id} needs text or magazine pages for its BTL reader`);
  if (p.openingMode === "reader") {
    errors.push(...articleErrors(p.readerContent ?? []).map(e => `${p.publication || p._id} · ${e}`));
    if (p.intro && (typeof p.intro !== 'string' || p.intro.length > 450)) errors.push(`${p.publication || p._id} introduction exceeds 450 characters or is malformed`);
  }
  if (p.openingMode === "embed" || p.openingMode === "external" && p.kind !== "award") {
    try {
      const url = new URL(p.url);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || p.openingMode === "embed" && url.protocol !== "https:") throw new Error();
    } catch {errors.push(`${p.publication || p._id} needs a valid ${p.openingMode === "embed" ? "HTTPS" : "web"} article address`);}
  }
}
checkFigure(data.settings?.founders, "Settings", "founders photograph");
checkFigure(data.settings?.teamImage, "Settings", "team photograph");
checkFigure(data.settings?.studioImage, "Settings", "studio photograph");
(data.settings?.studioImages ?? []).forEach((fig, i) => checkFigure(fig, "Settings", `studio photograph ${i + 1}`));
for (const nav of data.settings?.nav ?? []) {
  if (!nav.label?.trim() || !/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(nav.href ?? '')) errors.push('Settings · navigation needs a label and a valid page key');
}
for (const social of data.settings?.social ?? []) {
  try {
    const url = new URL(social.url);
    if (!social.label?.trim() || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
  } catch {errors.push('Settings · social link needs a label and a public web address');}
}
for (const clip of data.settings?.heroClips ?? []) {
  if (!clipVideoSources(clip).video || !clip.poster) errors.push(`Settings · opening film ${clip.label || '(untitled)'} needs its film and still frame`);
}

if (errors.length) {
  console.error(`\n[content] refusing to build — ${errors.length} problem${errors.length > 1 ? "s" : ""}:\n`);
  for (const e of errors) console.error("  · " + e);
  console.error("\nFix these in the Studio, then build again.\n");
  process.exit(1);
}

console.log(`[content] ${figures} figures valid`);
