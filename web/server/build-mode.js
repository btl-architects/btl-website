export function buildMode(env) {
  const preview = env.SANITY_PREVIEW === 'true';
  if (!env.SANITY_PROJECT_ID) throw new Error('SANITY_PROJECT_ID is required.');
  if (preview && !env.SANITY_PREVIEW_TOKEN) throw new Error('A preview requires SANITY_PREVIEW_TOKEN; published content cannot substitute for drafts.');
  if (preview && (env.CF_PAGES_BRANCH === 'main' || env.CONTEXT === 'production')) throw new Error('Draft content cannot be built on the production branch.');
  return {preview, client:{projectId:env.SANITY_PROJECT_ID,dataset:env.SANITY_DATASET || 'production',apiVersion:'2025-02-19',useCdn:false,perspective:preview ? 'drafts' : 'published',...(preview ? {token:env.SANITY_PREVIEW_TOKEN} : {})}};
}
/* Which builds may carry the enquiry key.
 *
 * The form posts from the visitor's browser straight to Web3Forms, because
 * Web3Forms rate-limits by source IP and a server relay on Cloudflare shares
 * its outgoing IPs with a great many other sites — it was answered 429 "IP
 * temporarily blocked" on its first real use. Sending from the browser means
 * the key has to be in the page, which Web3Forms designs for.
 *
 * What the relay used to guarantee — a preview never sends a real email — is
 * now decided here, at build time: a draft preview or a Cloudflare Pages build
 * of any branch other than main gets no key, and its form answers
 * "unavailable" without contacting anyone. Local and CI builds only get a key
 * if one is deliberately supplied. */
export function enquiryKey(env) {
  const key = String(env.ENQUIRY_ACCESS_KEY ?? '').trim();
  if (!key) return '';
  if (env.SANITY_PREVIEW === 'true') return '';
  if (env.CF_PAGES === '1' && env.CF_PAGES_BRANCH !== 'main') return '';
  return key;
}
export function visibleProjects(projects, preview = false) {
  return projects.filter(p => p.lifecycle === 'published' || (preview && p.lifecycle === 'draft'));
}
export function routedProjects(projects, preview = false) {
  return projects.filter(p => p.lifecycle === 'published' || p.lifecycle === 'archived' || (preview && p.lifecycle === 'draft'));
}
