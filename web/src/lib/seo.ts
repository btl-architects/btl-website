/** Search metadata is independent of the writing and headings inside <body>. */
export interface SearchListing { title?: string | null; description?: string | null }
export interface PageSearchListings {
  home?: SearchListing; projects?: SearchListing; press?: SearchListing;
  people?: SearchListing; studio?: SearchListing; contact?: SearchListing;
}

const pageKeys: Record<string, keyof PageSearchListings> = {
  '/': 'home', '/projects/': 'projects', '/press/': 'press',
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

export function businessStructuredData(settings: BusinessSettings, origin: string, image?: string | null) {
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
  };
}

export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
