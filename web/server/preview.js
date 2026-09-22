// The build, rather than a runtime dashboard flag, determines whether drafts
// need protection. A missing/malformed marker always fails closed.
export async function protectPreview({ request, env, next }) {
  let marker;
  try {
    const response = await env.ASSETS.fetch(new URL('/build-status.json', request.url));
    if (!response.ok) throw new Error('missing marker');
    marker = await response.json();
    if (typeof marker.preview !== 'boolean') throw new Error('invalid marker');
  } catch {
    return new Response('The website is temporarily unavailable.', {status:503,headers:{'Cache-Control':'no-store'}});
  }
  if (!marker.preview) return next();
  const headers = {'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
  if (!env.PREVIEW_PASSWORD || env.PREVIEW_PASSWORD.length < 16) return new Response('Preview access is not configured.',{status:503,headers});
  const wanted = 'Basic '+btoa((env.PREVIEW_USERNAME || 'preview')+':'+env.PREVIEW_PASSWORD);
  const incoming = request.headers.get('Authorization') || '';
  const hash = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b] = await Promise.all([hash(wanted),hash(incoming)]);
  let different = 0; for(let i=0;i<a.length;i++) different |= a[i]^b[i];
  if (different) return new Response('Sign in to view this preview.',{status:401,headers:{...headers,'WWW-Authenticate':'Basic realm="BTL preview", charset="UTF-8"'}});
  const original = await next();
  const response = new Response(original.body, original);
  for (const [key,value] of Object.entries(headers)) response.headers.set(key,value);
  return response;
}
