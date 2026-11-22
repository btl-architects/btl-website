/** Search metadata is independent of the writing and headings inside <body>. */
export interface SearchListing { title?: string | null; description?: string | null }
export interface PageSearchListings {
  home?: SearchListing; projects?: SearchListing; press?: SearchListing;
  people?: SearchListing; studio?: SearchListing; contact?: SearchListing;
}

const pageKeys: Record<string, keyof PageSearchListings> = {
  '/': 'home', '/projects/': 'projects', '/recognition/': 'press',
  '/people/': 'people', '/studio/': 'studio', '/contact/': 'contact',
};

/** Index-page overrides must never leak into project, article or profile pages. */
export function pageSearchListing(path: string, listings?: PageSearchListings) {
  const key = pageKeys[path.endsWith('/') ? path : `${path}/`];
  return key ? listings?.[key] : undefined;
}

export function searchMetadata(defaults: {title: string; description: string}, listing?: SearchListing) {
  return {
    title: listing?.title?.trim() || defaults.title,
    description: listing?.description?.trim() || defaults.description,
  };
}

interface BusinessSettings {
  name: string; tagline: string;
  contact: {address: string[]; phone: string; email: string};
  social: {url: string}[];
}

/** "IIID Kerala Design Awards 2026 · Gold, Single Dwelling" — one award, as
 *  schema.org's `award` text and the project page's recognition line. */
export function awardName(item: {publication: string; title: string}) {
  return [item.publication, item.title].filter(s => s?.trim()).join(' · ');
}

export function businessStructuredData(settings: BusinessSettings, origin: string, image?: string | null, awards: string[] = []) {
  const postalCode = settings.contact.address.join(', ').match(/\b\d{6}\b/)?.[0];
  const profiles = settings.social.map(s => s.url).filter(url => {
    try {
      const u = new URL(url);
      return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password &&
        u.pathname.replace(/\/+$/, '').length > 0;
    } catch { return false; }
  });
  return {
    '@context': 'https://schema.org', '@type': 'LocalBusiness',
    '@id': new URL('#practice', origin).href,
    name: settings.name, url: origin,
    logo: new URL('/favicon.svg', origin).href,
    ...(image ? {image} : {}),
    ...(settings.tagline ? {description: settings.tagline} : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.contact.address.slice(0, -1).join(', '),
      addressLocality: 'Kozhikode', addressRegion: 'Kerala', addressCountry: 'IN',
      ...(postalCode ? {postalCode} : {}),
    },
    ...(settings.contact.phone ? {telephone: settings.contact.phone} : {}),
    ...(settings.contact.email ? {email: settings.contact.email} : {}),
    ...(profiles.length ? {sameAs: profiles} : {}),
    ...(awards.length ? {award: awards} : {}),
  };
}

/** A project page names the work, its place and what it has won. */
export function projectStructuredData(project: {title: string; slug: string; location?: string | null; year?: string | number | null; description?: string | null},
  origin: string, practiceId: string, image?: string | null, awards: string[] = []) {
  return {
    '@context': 'https://schema.org', '@type': 'CreativeWork',
    '@id': new URL(`/projects/${project.slug}/#work`, origin).href,
    name: project.title, url: new URL(`/projects/${project.slug}/`, origin).href,
    creator: {'@id': practiceId},
    ...(project.location ? {locationCreated: {'@type': 'Place', name: project.location}} : {}),
    ...(project.year ? {dateCreated: String(project.year)} : {}),
    ...(project.description ? {description: project.description.slice(0, 300)} : {}),
    ...(image ? {image} : {}),
    ...(awards.length ? {award: awards} : {}),
  };
}

export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
