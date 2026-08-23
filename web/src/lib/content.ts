/* Content access — the second seam.
 *
 * Routes call getProjects(), getPeople(), getPublications(). They never read a
 * file and they never write a GROQ query. This module used to read the
 * prototype's content/*.json; it now queries Sanity, and because its types were
 * written against the target CMS schema from the beginning rather than the
 * shape of those files, the swap changed nothing above this line except that
 * the calls are now awaited.
 *
 * Two rules that used to live here as defensive filtering are now enforced by
 * the CMS itself, and so have been deleted rather than carried over: alt text
 * and licence are required fields, and placeholder documents were never
 * imported. The one filter that remains is `lifecycle == "published"`, because
 * that is a genuine editorial state rather than a data-quality workaround.
 */

import { sanity } from "./sanity";
import type { SiteImage } from "./media";

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
  location: string;
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
}

export interface Person {
  prefix: string; name: string; role: string; bio: string;
  portrait: SiteImage | null;
  tier: Tier; order: number; active: boolean;
}

export interface Publication {
  kind: PublicationKind;
  publication: string;
  logo: SiteImage | null;
  short: string;
  title: string;
  date: string;
  url: string;
  relatedProject: string | null;
}

export interface Settings {
  name: string; domain: string; tagline: string;
  nav: { label: string; href: string }[];
  social: { label: string; short: string; url: string }[];
  contact: {
    address: string[]; email: string; formTo: string;
    phone: string; phoneHref: string; gstin: string;
  };
  categories: Category[];
}

/* ------------------------------------------------------------- fragments --- */

// Fields are selected explicitly rather than with `...`, so a field added in
// the studio cannot silently start flowing into the front end unnoticed.
const FIGURE = `{
  "source": { "asset": asset, "hotspot": hotspot, "crop": crop },
  alt, caption, credit, rights, kind
}`;

const PROJECT = `{
  title,
  "slug": slug.current,
  "category": coalesce(category[]->slug.current, []),
  location, year, workStatus, lifecycle,
  "description": coalesce(description, ""),
  "featured": coalesce(featured, false),
  "order": coalesce(order, 0),
  "credits": {
    "architect": coalesce(credits.architect, "btl architects"),
    "photographer": coalesce(credits.photographer, ""),
    "collaborators": coalesce(credits.collaborators, [])
  },
  "images": images[] ${FIGURE},
  "related": coalesce(related[]->slug.current, [])
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
  const s = await sanity.fetch(`*[_type == "settings"][0]{
    name, domain, tagline, nav, social,
    address, email, formTo, phone, phoneHref, gstin
  }`);
  const categories = await sanity.fetch(
    `*[_type == "category"] | order(order asc) { label, "slug": slug.current }`,
  );
  return {
    name: s?.name ?? "btl architects",
    domain: s?.domain ?? "btldesigns.in",
    tagline: s?.tagline ?? "",
    nav: s?.nav ?? [],
    social: (s?.social ?? []).map((x: any) => ({ label: x.label, short: x.label, url: x.url })),
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

export const getProjects = once(async (): Promise<Project[]> => {
  const rows = await sanity.fetch(
    `*[_type == "project" && lifecycle == "published"] | order(order asc) ${PROJECT}`,
  );
  return (rows ?? []).map((p: any): Project => {
    // The cover leads the sequence rather than being held out of it: on the
    // project page it would otherwise be missing, and on a card it is the frame
    // already on screen when the card opens.
    const imgs: any[] = p.images ?? [];
    const cover = imgs.find((i) => i?.kind === "cover") ?? imgs[0];
    const ordered = cover ? [cover, ...imgs.filter((i) => i !== cover)] : imgs;
    return {
      ...p,
      images: ordered as SiteImage[],
      hook: (cover ?? ordered[0]) as SiteImage,
    };
  });
});

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
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

export async function getLocations(): Promise<{ slug: string; label: string }[]> {
  const seen = new Map<string, string>();
  for (const p of await getProjects()) {
    if (p.location) seen.set(locationSlug(p.location), p.location);
  }
  return [...seen].map(([slug, label]) => ({ slug, label }));
}

export function locationSlug(location: string): string {
  // The place, not the full address: "Thirunelly, Wayanad" files under wayanad.
  const last = location.split(",").pop()!.trim();
  return last.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const getPeople = once(async (): Promise<Person[]> => {
  const rows = await sanity.fetch(`*[_type == "person" && active == true] | order(order asc) {
    "prefix": coalesce(prefix, ""), name, role, "bio": coalesce(bio, ""),
    "portrait": portrait ${FIGURE},
    tier, "order": coalesce(order, 0), active
  }`);
  return (rows ?? []).map((p: any) => ({ ...p, portrait: p.portrait?.source?.asset ? p.portrait : null }));
});

export const getPublications = once(async (): Promise<Publication[]> => {
  const rows = await sanity.fetch(`*[_type == "publication"] | order(date desc) {
    kind, publication, "short": coalesce(short, ""), title,
    "date": coalesce(date, ""), "url": coalesce(url, ""),
    "logo": logo ${FIGURE},
    "relatedProject": relatedProject->slug.current
  }`);
  return (rows ?? []).map((x: any) => ({
    ...x,
    logo: x.logo?.source?.asset ? x.logo : null,
    relatedProject: x.relatedProject ?? null,
  }));
});

export const getHome = once(async () => {
  const s = await sanity.fetch(`*[_type == "settings"][0]{
    statement, studioLead, peopleLead, studioBody,
    "studioImage": studioImage ${FIGURE},
    "foundersImage": foundersImage ${FIGURE}
  }`);
  return {
    statement: s?.statement ?? "",
    // The People page gets its own words when the practice writes them, and
    // borrows the home statement until then — which is at least about who btl
    // is, rather than repeating the Studio page's design philosophy back at the
    // reader two pages later.
    peopleLead: s?.peopleLead || s?.statement || "",
    studio: {
      lead: s?.studioLead ?? "",
      body: (s?.studioBody ?? []) as string[],
      image: (s?.studioImage?.source?.asset ? s.studioImage : null) as SiteImage | null,
    },
    founders: (s?.foundersImage?.source?.asset ? s.foundersImage : null) as SiteImage | null,
  };
});
