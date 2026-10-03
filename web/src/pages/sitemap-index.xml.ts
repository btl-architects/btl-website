/* Generated, not maintained.
 *
 * Category and place routes are deliberately absent until the filter bar is
 * earned: they exist and resolve, but a set of near-empty index pages is thin
 * content that damages the pages that matter. They enter the sitemap by
 * themselves on the publish that earns them.
 */
import { isNoindex } from "../lib/sanity";
import type { APIRoute } from "astro";
import { getProjectRoutes, getEarnedCategories, getProfiles, getPublications } from "../lib/content";
import {articlePath} from "../lib/press";

export const GET: APIRoute = async ({ site }) => {
  const base = site?.href.replace(/\/$/, "") ?? "";
  const paths = isNoindex ? [] : [
    "/",
    "/projects/",
    ...(await getProjectRoutes()).map((p) => `/projects/${p.slug}/`),
    ...(await getEarnedCategories()).map((c) => `/projects/type/${c.slug}/`),
    "/people/",
    ...(await getProfiles()).map((p) => `/people/${p.slug}/`),
    "/studio/",
    "/privacy/",
    "/press/",
    ...(await getPublications()).filter(item => item.openingMode === "reader").map(articlePath).filter((path): path is string => Boolean(path)),
    "/contact/",
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${base}${p}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
