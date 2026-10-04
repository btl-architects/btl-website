import {clipVideoSources} from '../../shared/video.ts';
import {isSafeSlug} from '../../shared/slug.ts';
import {imageRightsError} from '../../shared/image-rights.ts';
import {articleErrors} from '../server/article-validation.js';

const KINDS = ["cover", "photograph", "drawing"];
const ALT_MIN = 8;
const ALT_MAX = 160;

/** Validate projected CMS data without network or process side effects. */
export function validateContent(data, {preview = false} = {}) {
  const errors = [];
  let figures = 0;
  const where = (doc, path) => `${doc} · ${path}`;

  /* One figure, wherever it appears. Every image on the site is one of these,
   * which is what makes a single function enough. */
  function checkFigure(fig, doc, path) {
    if (!fig) return;
    figures++;
    if (!fig.hasAsset) errors.push(`${where(doc, path)} has no image file`);

    const alt = typeof fig.alt === "string" ? fig.alt.trim() : "";
    if (!alt) errors.push(`${where(doc, path)} has no alt text`);
    else if (alt.length < ALT_MIN)
      errors.push(`${where(doc, path)} alt is ${alt.length} characters, minimum ${ALT_MIN} — "${alt}"`);
    else if (alt.length > ALT_MAX)
      errors.push(`${where(doc, path)} alt is ${alt.length} characters, maximum ${ALT_MAX}`);

    const licenceError = imageRightsError(fig.rights);
    if (licenceError) errors.push(`${where(doc, path)} · ${licenceError}`);

    // kind only applies to figures inside a project's image list; a portrait or a
    // masthead has no role to play in a project.
    if (fig.checkKind) {
      if (!fig.kind) errors.push(`${where(doc, path)} has no role set`);
      else if (!KINDS.includes(fig.kind))
        errors.push(`${where(doc, path)} role "${fig.kind}" is not one of ${KINDS.join(", ")}`);
    }
  }


  function checkSeo(seo, doc) {
    if (seo == null) return;
    for (const [key, max] of [['title', 60], ['description', 155]]) {
      if (seo[key] != null && (typeof seo[key] !== 'string' || seo[key].length > max))
        errors.push(`${doc} · search ${key} must be text of at most ${max} characters`);
    }
  }
  function checkSlugs(rows, type, reserved = [], max = 96) {
    const owners = new Map();
    for (const row of rows) {
      const id = row.title || row.label || row.name || row.publication || row._id;
      if (!isSafeSlug(row.slug) || row.slug.length > max || reserved.includes(row.slug))
        errors.push(`${id} · ${type} needs a valid nonreserved web address`);
      const old = Array.isArray(row.previousSlugs) ? row.previousSlugs : [];
      if (row.previousSlugs != null && !Array.isArray(row.previousSlugs)) errors.push(`${id} · previous addresses must be an array`);
      for (const slug of new Set([row.slug, ...old])) {
        if (!isSafeSlug(slug) || reserved.includes(slug)) {
          if (slug !== row.slug) errors.push(`${id} · invalid previous ${type} address`);
          continue;
        }
        if (owners.has(slug) && owners.get(slug) !== row._id) errors.push(`${id} · ${type} address ${slug} is already used by another record`);
        owners.set(slug, row._id);
      }
      checkSeo(row.seo, id);
    }
  }
  const projects = data.projects ?? [];
  checkSlugs(projects, 'project', ['type', 'place']);
  checkSlugs(data.categories ?? [], 'category', [], 40);
  checkSlugs(data.locations ?? [], 'location', [], 40);
  // Person slugs also generate redirects while profiles are switched off.
  checkSlugs((data.people ?? []).filter(p => p.slug), 'person');
  checkSlugs(data.publications ?? [], 'Press');
  if (data.settingsCount !== 1) errors.push('Settings · exactly one published settings record is required');
  for (const [key, seo] of Object.entries(data.settings?.pageSeo ?? {})) checkSeo(seo, `Settings · ${key}`);
  for (const p of projects) {
    const id = p.title || p._id;
    if (typeof p.title !== 'string' || !p.title.trim()) errors.push(`${id} needs a project title`);
    if (!['draft', 'published', 'archived'].includes(p.lifecycle)) errors.push(`${id} has an invalid lifecycle`);
    if (p.lifecycle === 'draft' && !preview) errors.push(`${id} · draft projects cannot enter a production build`);
    if (p.description != null && (typeof p.description !== 'string' || p.description.length > 600)) errors.push(`${id} · description exceeds 600 characters or is malformed`);
    if (!Array.isArray(p.category) || !p.category.length || p.category.some(ref => !ref?.slug || !ref?.label || ref?._type !== 'category')) errors.push(`${id} needs valid category references`);
    if (!p.location?.slug || !p.location?.label || p.location?._type !== 'location') errors.push(`${id} needs a valid location reference`);
  }
  for (const p of data.projects ?? []) {
    const id = p.title || p._id;

    const imgs = Array.isArray(p.images) ? p.images : [];
    if (!imgs.length) errors.push(`${id} has no photographs`);
    imgs.forEach((fig, i) => checkFigure({ ...fig, checkKind: true }, id, `photograph ${i + 1}`));

    // The cover is what the home page and the index lead with. Two covers means
    // the choice is made by array order, which is not a choice anyone made.
    const covers = imgs.filter((f) => f?.kind === "cover").length;
    if (p.lifecycle === "published" && covers !== 1)
      errors.push(`${id} has ${covers} covers — a published project needs exactly one`);
  }

  for (const p of data.people ?? []) checkFigure(p.portrait, p.name || p._id, "portrait");
  for (const p of data.publications ?? []) {
    checkFigure(p.image, p.publication || p._id, "Press image");
    checkFigure(p.articleHero, p.publication || p._id, "article opening photograph");
    const blocks = Array.isArray(p.readerContent) ? p.readerContent : [];
    blocks.forEach((b, i) => {if (b?._type === "figure") checkFigure(b, p.publication || p._id, `article image ${i + 1}`);});
    if (p.openingMode && !["reader", "embed", "external"].includes(p.openingMode))
      errors.push(`${p.publication || p._id} has an unknown article opening mode`);
    if (p.openingMode === "reader" && !blocks.some(b => b?._type === "figure" ? b.hasAsset : Array.isArray(b?.children) && b.children.some(s => typeof s?.text === 'string' && s.text.trim())))
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

  return {errors, figures};
}
