export function buildMode(env) {
  const preview = env.SANITY_PREVIEW === 'true';
  if (!env.SANITY_PROJECT_ID) throw new Error('SANITY_PROJECT_ID is required.');
  if (preview && !env.SANITY_PREVIEW_TOKEN) throw new Error('A preview requires SANITY_PREVIEW_TOKEN; published content cannot substitute for drafts.');
  if (preview && (env.CF_PAGES_BRANCH === 'main' || env.CONTEXT === 'production')) throw new Error('Draft content cannot be built on the production branch.');
  return {preview, client:{projectId:env.SANITY_PROJECT_ID,dataset:env.SANITY_DATASET || 'production',apiVersion:'2025-02-19',useCdn:false,perspective:preview ? 'drafts' : 'published',...(preview ? {token:env.SANITY_PREVIEW_TOKEN} : {})}};
}
export function visibleProjects(projects, preview = false) {
  return projects.filter(p => p.lifecycle === 'published' || (preview && p.lifecycle === 'draft'));
}
export function routedProjects(projects, preview = false) {
  return projects.filter(p => p.lifecycle === 'published' || p.lifecycle === 'archived' || (preview && p.lifecycle === 'draft'));
}
