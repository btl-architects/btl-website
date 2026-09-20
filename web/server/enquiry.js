// Pure handler shared by Cloudflare Pages and the local test harness.
// D1 stores short-lived HMAC keys and counters, never enquiry text or raw IPs.
const MAX_BYTES = 32 * 1024;
const WINDOW = 600;
const LIMIT_IP = 5;
const LIMIT_GLOBAL = 50;
const EMAIL = 'studio@btldesigns.in';
const encode = new TextEncoder();
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headers = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': "default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function respond(request, status, message, values = {}, retryAfter) {
  const extra = retryAfter ? {'Retry-After': String(retryAfter)} : {};
  if (request.headers.get('Accept')?.includes('application/json')) {
    return Response.json({ok: status < 400, message, ...(status < 400 ? {redirect: '/contact/thanks/'} : {})}, {status, headers: {...headers, ...extra}});
  }
  if (status < 400) return new Response(null, {status: 303, headers: {...headers, Location: '/contact/thanks/'}});
  const fields = [['name','Name','text',120],['email','Email','email',200],['phone','Phone (optional)','tel',40]];
  return new Response(`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Enquiry — btl architects</title><link rel="stylesheet" href="/styles/enquiry.css"></head><body><main><a href="/contact/">Back to Contact</a><h1>Your enquiry has not been confirmed</h1><p role="alert">${escape(message)}</p><p>You can also email <a href="mailto:${EMAIL}">${EMAIL}</a>.</p><form method="post" action="/api/enquiry">${fields.map(([name,label,type,max]) => `<label>${label}<input name="${name}" type="${type}" maxlength="${max}" ${name === 'phone' ? '' : 'required'} value="${escape(values[name] || '')}"></label>`).join('')}<label>Message<textarea name="message" minlength="20" maxlength="5000" required>${escape(values.message || '')}</textarea></label><input name="company" type="hidden" value=""><button>Send enquiry</button><p>Read our <a href="/privacy/">privacy notice</a>.</p></form></main></body></html>`, {status, headers: {...headers, ...extra, 'Content-Type':'text/html; charset=utf-8'}});
}

async function readForm(request) {
  const type = request.headers.get('Content-Type') || '';
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)(;|$)/i.test(type)) throw new Error('type');
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('type');
  const chunks = []; let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('size'); }
    chunks.push(value);
  }
  return new Response(new Blob(chunks), {headers:{'Content-Type':type}}).formData();
}

async function digest(secret, value) {
  const key = await crypto.subtle.importKey('raw', encode.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const result = await crypto.subtle.sign('HMAC', key, encode.encode(value));
  return Array.from(new Uint8Array(result), b => b.toString(16).padStart(2,'0')).join('');
}

export async function handleEnquiry(request, env, sendFetch = fetch) {
  if (request.method !== 'POST') return new Response(null, {status:303,headers:{...headers,Location:'/contact/'}});
  const origin = new URL(request.url).origin;
  const supplied = request.headers.get('Origin');
  const referrer = request.headers.get('Referer');
  let source;
  try { source = supplied ?? (referrer ? new URL(referrer).origin : null); } catch { source = null; }
  if (source !== origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return respond(request,403,'Please open the contact page on this website and try again.');
  }
  let form;
  try { form = await readForm(request); }
  catch (e) { return respond(request,e.message === 'size' ? 413 : 400,'Please use the contact form and keep your message under 5,000 characters.'); }
  const values = {};
  for (const name of ['name','email','phone','message','company']) {
    const value = form.get(name);
    if (value !== null && typeof value !== 'string') return respond(request,400,'File attachments are not accepted.');
    values[name] = (value || '').trim();
  }
  if (values.company) return respond(request,200,'Thank you.');
  if (!values.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email) || values.message.length < 20 ||
      /[\r\n]/.test(values.name + values.email) || values.name.length > 120 || values.email.length > 200 || values.phone.length > 40 || values.message.length > 5000) {
    return respond(request,400,'Please check your name, email and message (20–5,000 characters).',values);
  }
  if (!env.ENQUIRY_ACCESS_KEY || !env.ENQUIRY_DB) {
    console.error('[enquiry] service configuration is incomplete');
    return respond(request,503,'The form is temporarily unavailable. Your message has not been sent; please email the studio.',values);
  }
  const now = Math.floor(Date.now()/1000);
  const bucket = Math.floor(now/WINDOW);
  const expires = (bucket+1)*WINDOW;
  const db = env.ENQUIRY_DB;
  let fingerprint;
  try {
    // CF-Connecting-IP is supplied by the Cloudflare edge, not X-Forwarded-For.
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const key = await digest(env.ENQUIRY_ACCESS_KEY, 'ip:'+ip);
    fingerprint = await digest(env.ENQUIRY_ACCESS_KEY, JSON.stringify([values.name,values.email,values.phone,values.message]));
    await db.batch([
      db.prepare('DELETE FROM enquiry_limits WHERE expires <= ?').bind(now),
      db.prepare('DELETE FROM enquiry_receipts WHERE expires <= ?').bind(now),
    ]);
    const count = (key) => db.prepare('INSERT INTO enquiry_limits (key, count, expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,expires);
    const counters = await db.batch([count(`ip:${key}:${bucket}`),count(`global:${bucket}`)]);
    if (counters[0].results[0].count > LIMIT_IP || counters[1].results[0].count > LIMIT_GLOBAL) {
      return respond(request,429,'Too many attempts. Please wait a few minutes or email the studio.',values,expires-now);
    }
    const claim = await db.prepare("INSERT INTO enquiry_receipts (key, status, expires) VALUES (?, 'pending', ?) ON CONFLICT(key) DO NOTHING RETURNING key").bind(fingerprint,now+WINDOW).first();
    if (!claim) {
      const previous = await db.prepare('SELECT status FROM enquiry_receipts WHERE key=?').bind(fingerprint).first();
      if (previous?.status === 'sent') return respond(request,200,'Your enquiry has already been received.');
      return respond(request,409,'This enquiry is already being processed. Please wait before retrying, or email the studio if you need confirmation.',values,WINDOW);
    }
  } catch {
    console.error('[enquiry] protection storage unavailable');
    return respond(request,503,'The form is temporarily unavailable. Please email the studio.',values);
  }
  try {
    const response = await sendFetch('https://api.web3forms.com/submit', {
      method:'POST', signal:AbortSignal.timeout(10_000),
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({access_key:env.ENQUIRY_ACCESS_KEY,subject:`Enquiry from ${values.name} — btldesigns.in`,from_name:'btldesigns.in',replyto:values.email,name:values.name,email:values.email,phone:values.phone || '—',message:values.message}),
    });
    const result = await response.json();
    if (!response.ok || result?.success !== true) {
      // Only a definitive rejection is retryable immediately. An uncertain
      // response retains the short reservation to prevent duplicate emails.
      if (response.status < 500 && result?.success === false) {
        await db.prepare('DELETE FROM enquiry_receipts WHERE key=?').bind(fingerprint).run();
      }
      console.error('[enquiry] provider rejected submission');
      return respond(request,502,'Delivery could not be confirmed. Your message is kept below; please email the studio or try again later.',values);
    }
    await db.prepare("UPDATE enquiry_receipts SET status='sent' WHERE key=?").bind(fingerprint).run();
    return respond(request,200,'Thank you. Your enquiry has been received.');
  } catch {
    console.error('[enquiry] delivery could not be confirmed');
    return respond(request,502,'Delivery could not be confirmed. Please wait before retrying, or email the studio.',values);
  }
}
