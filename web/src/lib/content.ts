/* Content access — the second seam.
 *
 * Routes call getProjects(), getPeople(), getPublications(). They never read a
 * JSON file and they will never write a GROQ query. Today these functions read
 * the prototype's content/*.json; after the migration they query Sanity. The
 * types below are the *target* schema from the experience plan (§11), not the
 * shape of today's files — the normalising happens in here, once, so that every
 * route above this line is already written against the CMS and does not change
 * when the CMS arrives.
 *
 * Two deliberate renamings happen at this boundary, both moving today's files
 * towards the planned model:
 *   press[]  → Publication with an explicit `kind` — one content type covering
 *              press and awards, never two systems (plan §8).
 *   person.image/imageAlt → a portrait: SiteImage, so people, projects and
 *              publications all carry images in one shape.
 */

import siteJson from "../../../site/content/site.json";
import projectsJson from "../../../site/content/projects.json";
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
  /** The cover at its card crop. Same photograph, different ladder. */
  hook: SiteImage;
  related: string[];
}

export interface Person {
  prefix: string;
  name: string;
  role: string;
  bio: string;
  portrait: SiteImage | null;
  tier: Tier;
  order: number;
  active: boolean;
}

export interface Publication {
  kind: PublicationKind;
  publication: string;
  /** Set large as the object. Absent today for every entry — see the plan's
   *  typographic fallback, which is a designed state, not a broken one. */
  logo: SiteImage | null;
  short: string;
  title: string;
  date: string;
  url: string;
  relatedProject: string | null;
}

export interface Settings {
  name: string;
  domain: string;
  tagline: string;
  nav: { label: string; href: string }[];
  social: { label: string; short: string; url: string }[];
  contact: {
    address: string[]; email: string; formTo: string;
    phone: string; phoneHref: string; gstin: string;
  };
  categories: Category[];
}

/* ------------------------------------------------------------ normalise --- */

const site = siteJson as any;
const rawProjects = projectsJson as any[];

const img = (key: string, alt: string, extra: Partial<SiteImage> = {}): SiteImage =>
  ({ key, alt, ...extra });

/* Placeholder is not content.
 *
 * The prototype's JSON holds stubs so the layouts had something to push
 * against — "PLACEHOLDER — bio to come", four people called "Team member". They
 * were scaffolding for design, and shipping them is forbidden outright
 * (contract §1: no placeholder or lorem content in production).
 *
 * So a stub is treated as absent rather than rendered, in one place, and every
 * section that depends on one is written to disappear when it is missing. The
 * founders composition holds the People page on its own; the team list returns
 * by itself the day real names are entered. Nothing has to be remembered or
 * switched on — which is the same reasoning as the earned filter bar.
 */
const STUB = /^\s*(PLACEHOLDER\b|TBD\b|TODO\b|lorem\b)/i;
const STUB_NAMES = /^\s*(team member|name to come|placeholder)\s*$/i;

const real = (s: string | null | undefined): string | undefined =>
  s && s.trim() && !STUB.test(s) ? s : undefined;

/* Alt text is the one string that cannot simply be dropped. An image with no
 * alt is an accessibility failure, and alt="" would declare an architectural
 * photograph decorative, which it is not. The stubs here are prefixed
 * descriptions — "Placeholder alt text — bedroom with a writing desk" — so the
 * prefix comes off and the description behind it, which is accurate, stays. */
const altText = (s: string | null | undefined, fallback: string): string => {
  const stripped = (s ?? "").replace(/^\s*(placeholder(\s+alt\s+text)?|TBD|TODO)\s*[—–:-]\s*/i, "").trim();
  return stripped || fallback;
};

export function getSettings(): Settings {
  return {
    name: site.name,
    domain: site.domain,
    tagline: site.tagline,
    nav: site.nav,
    social: site.social,
    contact: site.contact,
    categories: site.categories,
  };
}

export function getProjects(): Project[] {
  return rawProjects
    .filter((p) => p.lifecycle === "published")
    .map((p): Project => {
      // The cover leads the sequence rather than being held out of it, and the
      // manifest was written in that order — so the keys must be derived the
      // same way or every project shows the wrong photographs.
      const cover = p.images.find((i: any) => i.kind === "cover") ?? p.images[0];
      const ordered = [cover, ...p.images.filter((i: any) => i !== cover)];
      return {
        title: p.title,
        slug: p.slug,
        category: p.category ?? [],
        location: p.location,
        year: p.year ?? null,
        workStatus: p.workStatus,
        lifecycle: p.lifecycle,
        // The photographs are real even where the writeup has not been
        // written yet, so the project still publishes — it just does not
        // narrate itself until the studio supplies the paragraph.
        description: real(p.description) ?? "",
        featured: !!p.featured,
        order: p.order ?? 0,
        credits: p.credits,
        images: ordered.map((im: any, i: number) =>
          img(`${p.slug}-${String(i + 1).padStart(2, "0")}`,
              altText(im.alt, `${p.title}, ${p.location}`), {
            caption: im.caption ?? undefined,
            credit: im.credit ?? undefined,
            rights: im.rights ?? undefined,
          })),
        hook: img(`${p.slug}-hook`, altText(cover.alt, `${p.title}, ${p.location}`),
                  { credit: cover.credit ?? undefined }),
        related: p.related ?? [],
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}

/* --- the filter bar is earned, not switched on (design system §05) ---------
 *
 * Splitting four projects across three categories gives three pages, two of
 * them nearly empty, which makes a young practice look thinner than it is. So
 * the bar appears by itself when the content justifies it, on a rule evaluated
 * at build: at least two categories each holding at least three published
 * projects. Until then the index is simply all the work — which at four
 * projects is the right answer anyway.
 *
 * The category routes are generated the whole time and carry their own
 * metadata. They are just not linked from anywhere, and stay out of the
 * sitemap, until they hold enough to be worth landing on. The studio adds its
 * fifth house and its third interior and the bar appears on the next publish,
 * with no developer involved either way.
 */
const EARNED_MIN_PER = 3;
const EARNED_MIN_CATS = 2;

export function countByCategory(): Map<string, number> {
  const n = new Map<string, number>();
  for (const p of getProjects()) {
    for (const c of p.category) n.set(c, (n.get(c) ?? 0) + 1);
  }
  return n;
}

/** Categories carrying at least one published project — these get routes. */
export function getLiveCategories(): Category[] {
  const n = countByCategory();
  return getSettings().categories.filter((c) => (n.get(c.slug) ?? 0) > 0);
}

/** Categories worth *linking* to. Empty until the work earns the bar. */
export function getEarnedCategories(): Category[] {
  const n = countByCategory();
  const qualifying = getSettings().categories.filter(
    (c) => (n.get(c.slug) ?? 0) >= EARNED_MIN_PER,
  );
  return qualifying.length >= EARNED_MIN_CATS ? qualifying : [];
}

/** Distinct locations across published work, for /projects/place/[location]. */
export function getLocations(): { slug: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const p of getProjects()) {
    if (!p.location) continue;
    seen.set(locationSlug(p.location), p.location);
  }
  return [...seen].map(([slug, label]) => ({ slug, label }));
}

export function locationSlug(location: string): string {
  // The place, not the full address: "Thirunelly, Wayanad" files under wayanad.
  const last = location.split(",").pop()!.trim();
  return last.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getPeople(): Person[] {
  return (site.people as any[])
    .filter((p) => p.active && p.name && !STUB_NAMES.test(p.name))
    .map((p): Person => ({
      prefix: p.prefix,
      name: p.name,
      role: p.role,
      bio: real(p.bio) ?? "",
      portrait: p.image ? img(p.image, altText(p.imageAlt, `${p.prefix} ${p.name}`.trim())) : null,
      tier: p.tier,
      order: p.order ?? 0,
      active: p.active,
    }))
    .sort((a, b) => a.order - b.order);
}

export function getPublications(): Publication[] {
  return (site.press as any[])
    // PLACEHOLDER rows are stubs held open for entries that do not exist yet.
    // Four "Publication to come" lines under one real credit make the practice
    // look like it is waiting rather than published, and shipping placeholder
    // content is forbidden outright (contract §1). One masthead that is real
    // beats five where four are not. They reappear by themselves as the CMS
    // fills them in.
    .filter((x) => x.publication && x.publication !== "PLACEHOLDER")
    .map((x): Publication => ({
    // Today's file predates the merge, so everything in it is press. Awards
    // enter through the same type the moment the CMS carries them.
    kind: (x.kind as PublicationKind) ?? "press",
    publication: x.publication,
    logo: x.logo ? img(x.logo, `${x.publication} logo`) : null,
    short: x.short,
    title: x.title,
    date: x.date,
    url: x.url,
    relatedProject: x.relatedProject ?? null,
  }));
}

export function getHome() {
  return {
    statement: site.home.statement as string,
    openingCaption: site.home.openingCaption as string,
    studio: {
      ...(site.studio as any),
      body: (site.studio.body as string[]).filter((b) => real(b)),
    } as { lead: string; body: string[]; image: string; imageAlt: string },
    landing: site.landing as { image: string; alt: string },
  };
}
