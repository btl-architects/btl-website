// The build, rather than a runtime dashboard flag, determines whether drafts
// need protection. A missing/malformed marker always fails closed.
export async function protectPreview({ request, env, next }) {
  let marker;
  try {
    const response = await env.ASSETS.fetch(new URL('/build-status.json', request.url));
    if (!response.ok) throw new Error('missing marker');
    marker = await response.json();
    if (typeof marker.preview !== 'boolean' || typeof marker.noindex !== 'boolean' || marker.preview && !marker.noindex) throw new Error('invalid marker');
  } catch {
    return new Response('The website is temporarily unavailable.', {status:503,headers:{'Cache-Control':'no-store'}});
  }
  if (!marker.preview) {
    const original = await next();
    if (!marker.noindex) return original;
    const response = new Response(original.body, original);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  const headers = {'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
  const username = env.PREVIEW_USERNAME || 'preview';
  if (typeof env.PREVIEW_PASSWORD !== 'string' || env.PREVIEW_PASSWORD.length < 16 || typeof username !== 'string' || /[:\x00-\x1f\x7f]/.test(username) || /[\x00-\x1f\x7f]/.test(env.PREVIEW_PASSWORD)) return new Response('Preview access is not configured.',{status:503,headers});
  // Match the advertised UTF-8 challenge. btoa on a JavaScript string both
  // misencodes accented credentials and throws for characters outside Latin-1.
  const credentials = (username+':'+env.PREVIEW_PASSWORD).normalize('NFC');
  const wanted = btoa(Array.from(new TextEncoder().encode(credentials), byte => String.fromCharCode(byte)).join(''));
  const incoming = /^Basic\s+([A-Za-z0-9+/]+={0,2})$/i.exec(request.headers.get('Authorization') || '')?.[1] || '';
  const hash = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b] = await Promise.all([hash(wanted),hash(incoming)]);
  let different = 0; for(let i=0;i<a.length;i++) different |= a[i]^b[i];
  if (different) return new Response('Sign in to view this preview.',{status:401,headers:{...headers,'WWW-Authenticate':'Basic realm="BTL preview", charset="UTF-8"'}});
  const original = await next();
  const response = new Response(original.body, original);
  for (const [key,value] of Object.entries(headers)) response.headers.set(key,value);
  return response;
}
