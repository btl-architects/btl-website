/* Things that are built and ready but not switched on.
 *
 * PROFILES — a person with a bio in Sanity opening from the People page as a
 * card over the page, the way a Press feature does (press-reader.js), backed
 * by their own page at /people/<slug>/. The practice has not asked for it yet,
 * so it is off: names and portraits on People are not links, no person pages
 * are published or listed in the sitemap, and any address that was published
 * while it was on sends visitors to /people/ (a 302, since it may return).
 * Bios entered in Sanity are kept either way. Set to true to switch the whole
 * thing on — the links, the pages, the sitemap entries and the card together. */
export const PROFILES = false;
