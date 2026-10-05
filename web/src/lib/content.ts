/* Content access — the second seam.
 *
 * Routes call getProjects(), getPeople(), getPublications(). They never read a
 * file and they never write a GROQ query. This module used to read the
 * prototype's content/*.json; it now queries Sanity, and because its types were
 * written against the target CMS schema from the beginning rather than the
 * shape of those files, the swap changed nothing above this line except that
 * the calls are now awaited.
 *
 * Build validation enforces image, route and content invariants even for API
 * imports. The content seam also omits exact provisional photographer labels:
 * unsupplied optional attribution is absent, never replaced with an invented name.
 * Lifecycle remains the editorial distinction between an index and a public URL.
 */

import { sanity, isPreview } from "./sanity";
import { PROFILES } from "../../server/features.js";
import { visibleProjects, routedProjects } from "../../server/build-mode.js";
import type { SiteImage } from "./media";
import type {SearchListing, PageSearchListings} from './seo';
import type {ArticleBlock, OpeningMode} from "./press";
import {articleUrl} from "./press";
import {clipVideoMode, clipVideoSources, muxPlaybackId, type ClipVideoSources} from "../../../shared/video";
import {optionalPhotographerCredit} from "../../../shared/credits";
import {artworkBounds} from '../../server/artwork-bounds.js';
import {urlFor} from './sanity';

/* ---------------------------------------------------------------- types --- */

export type Lifecycle = "draft" | "published" | "archived";
export type WorkStatus = "completed" | "in-progress" | "on-hold";
export type Tier = "principal" | "team" | "alumni";
export type PublicationKind = "press" | "award";

export interface Category { slug: string; label: string }

export interface Project {
  title: string;
  slug: string;
  category: string[];
  /** The place as it should be written. */
  location: string;
  /** Its route segment, stated by the CMS rather than derived from the label. */
  locationSlug: string;
  year: number | null;
  workStatus: WorkStatus;
  lifecycle: Lifecycle;
  description: string;
  featured: boolean;
  order: number;
  credits: { architect: string; photographer: string; collaborators: string[] };
  /** Cover first — it is the frame already on screen when a card opens. */
  images: SiteImage[];
  /** The cover again, for card use. Same photograph, different derived size. */
  hook: SiteImage;
  related: string[];
  /** What the practice wants a search result to say, when the derived title and
   *  opening line are not what they would have written. Both optional. */
  seo: { title: string | null; description: string | null };
}

export interface Person {
  prefix: string; name: string; role: string; bio: string;
  slug: string;
  portrait: SiteImage | null;
  tier: Tier; order: number; active: boolean;
  showInTeam?: boolean; showRoleOnHome?: boolean; homeOrder?: number;
  seo?: SearchListing;
}

export interface Publication {
  seo?: SearchListing;
  id?: string;
  slug?: string;
  kind: PublicationKind;
  publication: string;
  image: SiteImage | null;
  useProjectImage: boolean;
  short: string;
  title: string;
  date: string;
  url: string;
  relatedProject: string | null;
  openingMode?: OpeningMode;
  byline?: string;
  sourceAuthor?: string;
  readerKind?: "notes" | "summary" | "article";
  intro?: string;
  articleHero?: SiteImage | null;
  articleCredits?: Project["credits"];
  readerPublishedAt?: string;
  readerContent?: ArticleBlock[];
}

/** The lines that carry the practice's voice. Each has a default, so an empty
 *  field never leaves a blank page — it just goes back to the written one. */
export interface Copy {
  footerCta: string;
  projectsLead: string;
  locationLabel: string;
  pressLead: string;
  peopleOnward: string;
  studioOnward: string;
  notFoundLead: string;
}

export interface Settings {
  name: string; domain: string; tagline: string;
  pageSeo?: PageSearchListings;
  copy: Copy;
  nav: { label: string; href: string }[];
  social: { label: string; short: string; url: string }[];
  contact: {
    address: string[]; email: string; formTo: string;
    phone: string; phoneHref: string; gstin: string;
  };
  categories: Category[];
}

type SettingsRow = Partial<Omit<Settings, "copy" | "contact" | "categories" | "social"> & Copy & Settings["contact"]> & {
  social?: {label: string; url: string}[];
};
type ProjectRow = Omit<Project, "hook" | "images"> & {images: (SiteImage & {kind?: string})[]};
type CmsImage = SiteImage & {source: {asset: {_ref: string} | null}};
type PublicationRow = Omit<Publication, "image" | "articleHero"> & {image?: CmsImage; articleHero?: CmsImage};
type PersonRow = Omit<Person, "portrait"> & {portrait?: CmsImage};
type HeroClipRow = Omit<HeroClip, "poster" | "posterPortrait"> & ClipVideoSources & {poster?: CmsImage; posterPortrait?: CmsImage};

/* ------------------------------------------------------------- fragments --- */

// Fields are selected explicitly rather than with `...`, so a field added in
// the studio cannot silently start flowing into the front end unnoticed.
/* lqip is a ~550-byte base64 thumbnail Sanity generates for every upload. It
 * travels inside the HTML, costs no request, and is what the visitor looks at
 * while the real photograph is still coming down the wire. Dimensions come from
 * metadata rather than being parsed out of the asset id — the same numbers, but
 * stated by the CMS rather than inferred from a filename.
 *
 * GROQ has no block comments, so this note lives out here rather than inside
 * the query, which is what broke the build the first time. */
const FIGURE = `{
  "source": asset,
  alt, caption, credit, rights, kind,
  "lqip": asset.asset->metadata.lqip,
  "dimensions": asset.asset->metadata.dimensions{width, height}
}`;

const PROJECT = `{
  title,
  "slug": slug.current,
  "category": coalesce(category[]->slug.current, []),
  "location": coalesce(location->label, ""),
  "locationSlug": coalesce(location->slug.current, ""),
  year, workStatus, lifecycle,
  "description": coalesce(description, ""),
  "featured": coalesce(featured, false),
  "order": coalesce(order, 0),
  "credits": {
    "architect": coalesce(credits.architect, "btl architects"),
    "photographer": coalesce(credits.photographer, ""),
    "collaborators": coalesce(credits.collaborators, [])
  },
  "images": images[] ${FIGURE},
  "related": coalesce(related[]->slug.current, []),
  "seo": { "title": seo.title, "description": seo.description }
}`;

/* --------------------------------------------------------------- queries --- */

/* One fetch per build, shared by every route.
 *
 * Astro renders 16 routes and most of them want the project list. Without this
 * the same query would run a dozen times against the same unchanging dataset,
 * which is slow and pointless — the content cannot change mid-build. */
const once = <T>(fn: () => Promise<T>): (() => Promise<T>) => {
  let p: Promise<T> | null = null;
  return () => (p ??= fn());
};

export const getSettings = once(async (): Promise<Settings> => {
  const s = await sanity.fetch<SettingsRow | null>(`*[_type == "settings"][0]{
    name, domain, tagline, nav[]{label, href}, social[]{label, url},
    pageSeo{
      home{title,description}, projects{title,description}, press{title,description},
      people{title,description}, studio{title,description}, contact{title,description}
    },
    footerCta, locationLabel, projectsLead, pressLead, peopleOnward, studioOnward, notFoundLead,
    address, email, formTo, phone, phoneHref, gstin
  }`);
  const categories = await sanity.fetch<Category[]>(
    `*[_type == "category"] | order(order asc) { label, "slug": slug.current }`,
  );
  return {
    name: s?.name ?? "btl architects",
    domain: s?.domain ?? "btldesigns.in",
    tagline: s?.tagline ?? "",
    pageSeo: s?.pageSeo,
    copy: {
      footerCta: s?.footerCta || "Let's build something that lasts.",
      projectsLead: s?.projectsLead ||
        "Houses, interiors and the occasional commercial project, across Kerala.",
      locationLabel: s?.locationLabel || "Kozhikode, Kerala",
      pressLead: s?.pressLead || "See where we've been.",
      peopleOnward: s?.peopleOnward || "Inside the studio",
      studioOnward: s?.studioOnward || "Tell us what you want to build",
      notFoundLead: s?.notFoundLead ||
        "It may have moved, or the link may be wrong. Here is what we did build.",
    },
    nav: (s?.nav ?? []).filter(n => /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(n.href)),
    social: (s?.social ?? []).flatMap(x => {
      const url = articleUrl(x.url);
      return url && x.label?.trim() ? [{label: x.label, short: x.label, url}] : [];
    }),
    contact: {
      address: s?.address ?? [],
      email: s?.email ?? "",
      formTo: s?.formTo ?? "",
      phone: s?.phone ?? "",
      phoneHref: s?.phoneHref ?? "",
      gstin: s?.gstin ?? "",
    },
    categories: categories ?? [],
  };
});

const getAllProjects = once(async (): Promise<Project[]> => {
  const rows = await sanity.fetch<ProjectRow[]>(
    `*[_type == "project" && lifecycle in $states] | order(coalesce(order, 0) asc, _id asc) ${PROJECT}`,
    { states: isPreview ? ["draft", "published", "archived"] : ["published", "archived"] },
  );
  return (rows ?? []).map((p): Project => {
    // The cover leads the sequence rather than being held out of it: on the
    // project page it would otherwise be missing, and on a card it is the frame
    // already on screen when the card opens.
    const imgs = (p.images ?? []).map(image => ({...image, credit: optionalPhotographerCredit(image.credit)}));
    const cover = imgs.find((i) => i?.kind === "cover") ?? imgs[0];
    const ordered = cover ? [cover, ...imgs.filter((i) => i !== cover)] : imgs;
    return {
      ...p,
      credits: {...p.credits, photographer: optionalPhotographerCredit(p.credits.photographer)},
      images: ordered as SiteImage[],
      hook: (cover ?? ordered[0]) as SiteImage,
    };
  });
});

export const getProjects = once(async (): Promise<Project[]> => visibleProjects(await getAllProjects(), isPreview));
export const getProjectRoutes = once(async (): Promise<Project[]> => routedProjects(await getAllProjects(), isPreview));

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjectRoutes()).find((p) => p.slug === slug);
}

/* --- the filter bar is earned, not switched on (design system §05) ---------
 *
 * Splitting four projects across three categories gives three pages, two of
 * them nearly empty, which makes a young practice look thinner than it is. So
 * the bar appears by itself when the content justifies it: at least two
 * categories each holding at least three published projects.
 *
 * The category routes are generated the whole time and carry their own
 * metadata. They are simply not linked from anywhere, and stay out of the
 * sitemap, until they hold enough to be worth landing on. The studio adds its
 * fifth house and its third interior and the bar appears on the next publish,
 * with no developer involved either way.
 */
const EARNED_MIN_PER = 3;
const EARNED_MIN_CATS = 2;

export async function countByCategory(): Promise<Map<string, number>> {
  const n = new Map<string, number>();
  for (const p of await getProjects()) {
    for (const c of p.category) n.set(c, (n.get(c) ?? 0) + 1);
  }
  return n;
}

/** Categories carrying at least one published project — these get routes. */
export async function getLiveCategories(): Promise<Category[]> {
  const n = await countByCategory();
  return (await getSettings()).categories.filter((c) => (n.get(c.slug) ?? 0) > 0);
}

/** Categories worth *linking* to. Empty until the work earns the bar. */
export async function getEarnedCategories(): Promise<Category[]> {
  const n = await countByCategory();
  const qualifying = (await getSettings()).categories.filter(
    (c) => (n.get(c.slug) ?? 0) >= EARNED_MIN_PER,
  );
  return qualifying.length >= EARNED_MIN_CATS ? qualifying : [];
}

/* Places that actually carry published work.
 *
 * These are documents now, not strings pulled off projects and slugified. When
 * location was free text, "Calicut" and "Kozhikode" produced two routes for one
 * city, each holding part of the work — and nothing stopped the next spelling
 * arriving. A reference cannot be misspelled into a second place. */
export async function getLocations(): Promise<{ slug: string; label: string }[]> {
  const seen = new Map<string, string>();
  for (const p of await getProjects()) {
    if (p.locationSlug) seen.set(p.locationSlug, p.location);
  }
  return [...seen].map(([slug, label]) => ({ slug, label }));
}

export const getPeople = once(async (): Promise<Person[]> => {
  const rows = await sanity.fetch<PersonRow[]>(`*[_type == "person" && active == true] | order(coalesce(order, 0) asc, _id asc) {
    "prefix": coalesce(prefix, ""), name, "role": coalesce(role, ""), "bio": coalesce(bio, ""), seo{title,description},
    "slug": coalesce(slug.current, ""),
    "portrait": portrait ${FIGURE},
    tier, "order": coalesce(order, 0), active,
    "showInTeam": coalesce(showInTeam,true), "showRoleOnHome": coalesce(showRoleOnHome,false), "homeOrder": coalesce(homeOrder,order,0)
  }`);
  return (rows ?? []).map((p) => ({ ...p, role: (p.role ?? "").trim(), portrait: p.portrait?.source?.asset ? p.portrait : null }));
});

/* Who gets a page of their own.
 *
 * Not everybody. A profile containing a name and a job title is a worse
 * experience than no profile at all — it looks like a page that failed to
 * load, and it puts a link on the People page that punishes anyone who follows
 * it. So the route exists for people the practice has actually written about,
 * and appears the day a bio is added (R16: the interface is earned). */
/* People with their own page — none while the profiles switch is off
   (server/features.js). Pages, sitemap entries and links all follow this. */
export async function getProfiles(): Promise<Person[]> {
  if (!PROFILES) return [];
  return (await getPeople()).filter((p) => p.slug && p.bio);
}

export const getPublications = once(async (): Promise<Publication[]> => {
  const rows = await sanity.fetch<PublicationRow[]>(`*[_type == "publication"] | order(date desc) {
    "id": _id, "slug":slug.current, "openingMode": coalesce(openingMode, "external"), byline, sourceAuthor, readerKind, intro, readerPublishedAt, seo{title,description},
    "articleHero": articleHero ${FIGURE},
    "articleCredits": articleCredits{architect, photographer, "collaborators": coalesce(collaborators, [])},
    "readerContent": readerContent[]{
      _type, style, listItem, level, children[]{text, marks}, markDefs[]{_key, _type, href}, text, attribution,
      _type == "figure" => ${FIGURE}
    },
    kind, publication, "short": coalesce(short, ""), title,
    "date": coalesce(date, ""), "url": coalesce(url, ""),
    "image": image ${FIGURE},
    "useProjectImage": coalesce(useProjectImage, true),
    "relatedProject": relatedProject->slug.current
  }`);
  return Promise.all((rows ?? []).map(async x => ({
    ...x,
    articleCredits: x.articleCredits ? {...x.articleCredits, photographer: optionalPhotographerCredit(x.articleCredits.photographer)} : undefined,
    articleHero: x.articleHero?.source?.asset ? {...x.articleHero, credit: optionalPhotographerCredit(x.articleHero.credit)} : null,
    readerContent: x.readerContent?.map(block => block._type === "figure" ? {...block, credit: optionalPhotographerCredit(block.credit)} : block),
    image: x.image?.source?.asset ? {...x.image,artworkBounds:await artworkBounds(urlFor(typeof x.image.source==='object' ? {...x.image.source,crop:undefined,hotspot:undefined} : x.image.source).width(400).format('png').fit('max').url())} : null,
    relatedProject: x.relatedProject ?? null,
  })));
});

export interface HeroClip {
  key: string;
  label: string;
  video: string;
  videoPortrait: string;
  poster: SiteImage | null;
  /** The matching first frame of the portrait cut. */
  posterPortrait: SiteImage | null;
}

/* A 720p file added in Mux after upload (for example to an existing asset)
 * exists before Sanity's stored copy of the asset lists it. Ask Mux directly
 * so the phone file is used as soon as it is ready; any failure keeps the
 * file the record names. */
async function phoneRendition(clip: ClipVideoSources, chosen: string): Promise<string> {
  if (clipVideoMode(clip) !== 'mux' || /\/720p\.mp4$/.test(chosen || '')) return chosen;
  for (const asset of [clip.videoPortraitMux, clip.videoMux]) {
    const id = muxPlaybackId(asset);
    if (!id) continue;
    const url = `https://stream.mux.com/${id}/720p.mp4`;
    try {
      const response = await fetch(url, {method: 'HEAD', signal: AbortSignal.timeout(8000)});
      if (response.ok) return url;
    } catch { /* keep the recorded file */ }
    // The portrait cut is preferred; only fall through to the landscape film
    // when there is no portrait cut at all.
    if (asset === clip.videoPortraitMux) break;
  }
  return chosen;
}

/** The opening sequence, straight from the CMS. Empty is a legitimate state:
 *  the landing simply has no film in it and the page still works. */
export const getHeroClips = once(async (): Promise<HeroClip[]> => {
  const rows = await sanity.fetch<HeroClipRow[]>(`*[_type == "settings"][0].heroClips[]{
    "key": _key,
    "label": coalesce(label, ""),
    videoMode,
    "video": video.asset->url,
    "videoPortrait": videoPortrait.asset->url,
    "videoMux": videoMux.asset->{status, data{playback_ids[]{id,policy}, static_renditions{files[]{status,name,ext}}}},
    "videoPortraitMux": videoPortraitMux.asset->{status, data{playback_ids[]{id,policy}, static_renditions{files[]{status,name,ext}}}},
    "poster": { "source": { "asset": poster.asset }, "alt": "",
                "lqip": poster.asset->metadata.lqip,
                "dimensions": poster.asset->metadata.dimensions{width, height} },
    "posterPortrait": { "source": { "asset": posterPortrait.asset }, "alt": "",
                "lqip": posterPortrait.asset->metadata.lqip,
                "dimensions": posterPortrait.asset->metadata.dimensions{width, height} }
  }`);
  const withSources = await Promise.all((rows ?? []).map(async c => {
    const sources = clipVideoSources(c);
    return {...c, ...sources, videoPortrait: await phoneRendition(c, sources.videoPortrait)};
  }));
  return withSources
    .filter(c => c.video)
    .map((c): HeroClip => ({
      key: c.key,
      label: c.label,
      video: c.video,
      // Without a portrait cut a phone gets the landscape one, which is the
      // right fallback: a differently framed film, never a missing one.
      videoPortrait: c.videoPortrait || c.video,
      poster: c.poster?.source?.asset ? c.poster : null,
      posterPortrait: c.posterPortrait?.source?.asset ? c.posterPortrait : null,
    }));
});

export const getHome = once(async () => {
  const s = await sanity.fetch<{
    statement?: string; studioLead?: string; peopleLead?: string; studioBody?: string[];
    homePeopleLead?: string; homeStudioLead?: string; homeStudioNote?: string;
    studioImages?: CmsImage[]; studioImage?: CmsImage; foundersImage?: CmsImage; teamImage?: CmsImage;
  } | null>(`*[_type == "settings"][0]{
    statement, studioLead, peopleLead, studioBody, homePeopleLead, homeStudioLead, homeStudioNote,
    "studioImages": studioImages[] ${FIGURE},
    "studioImage": studioImage ${FIGURE},
    "foundersImage": foundersImage ${FIGURE},
    "teamImage": teamImage ${FIGURE}
  }`);
  return {
    statement: s?.statement ?? "",
    // Home and full-page introductions are independent, including when empty.
    peoplePreview: s?.homePeopleLead ?? "",
    studioPreview: {lead: s?.homeStudioLead ?? "", note: s?.homeStudioNote ?? ""},
    /* No fallback. This used to borrow the home statement when peopleLead was
     * unwritten, on the reasoning that words about who btl is beat no words at
     * all. In practice nobody ever wrote peopleLead, so the same paragraph ran
     * three times — the home statement, the people section under it, and again
     * at the top of the People page — which is how a fallback that looked
     * generous turned into the site repeating itself to anyone who read more
     * than one page.
     *
     * A borrowed sentence also hides the gap: while the page looked filled, no
     * one had any reason to write the real one. Empty is honest, the sections
     * that need it now decline to render (R15), and the day somebody writes a
     * People introduction it appears on its own. */
    peopleLead: s?.peopleLead ?? "",
    studio: {
      lead: s?.studioLead ?? "",
      body: (s?.studioBody ?? []) as string[],
      /* Only photographs that actually resolved to an asset. A figure whose
       * upload was never finished is an object with no asset behind it, and it
       * renders as a broken frame in the middle of the page rather than as
       * nothing — the same reasoning the method stages used to need. */
      images: (s?.studioImages ?? []).filter(i => i.source?.asset),
      image: (s?.studioImage?.source?.asset ? s.studioImage : null) as SiteImage | null,
    },
    founders: (s?.foundersImage?.source?.asset ? s.foundersImage : null) as SiteImage | null,
    teamImage: (s?.teamImage?.source?.asset ? s.teamImage : null) as SiteImage | null,
  };
});
