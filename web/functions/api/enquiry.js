/* The enquiry form's backend. A Cloudflare Pages Function, served at
 * /api/enquiry from this site's own origin.
 *
 * This replaces Netlify Forms, which was the single thing tying the site to
 * that host. Everything else about the move was configuration; this was the one
 * piece of behaviour.
 *
 * It could have posted straight to a form service from the browser. It does not,
 * for two reasons. The CSP says form-action 'self', so a form that posted
 * anywhere else would need that relaxed — trading a real protection for a
 * saved file. And a browser-side integration puts the provider's key in the
 * page, where it can be lifted and used to fill the studio's inbox with someone
 * else's spam. Posting here keeps both: the policy stays shut and the key stays
 * on the server.
 *
 * The provider is reached through one function at the bottom. Swapping it means
 * changing that, and nothing else in the site knows or cares.
 *
 * WHERE ENQUIRIES LAND IS NOT SET HERE. Web3Forms has no recipient parameter —
 * it delivers to whichever address the access key's account was registered
 * with, and CC'ing anyone else is a paid feature. An earlier version of this
 * file passed a `to` field, which read as though the destination were under our
 * control; the API ignores it silently, which is the worst way to be wrong. To
 * change the destination, change the email on the Web3Forms account.
 *
 * Environment (set in the Cloudflare Pages dashboard, not in the repository):
 *   ENQUIRY_ACCESS_KEY  — required. The form provider's key.
 */

/* Deliberately loose. This is a sanity check, not an attempt to decide what a
 * valid address is — every strict email regex on the internet rejects somebody's
 * real address, and the studio would rather answer a bounced enquiry than never
 * see it. The real test is whether a reply arrives. */
const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

const field = (form, name) => (form.get(name) ?? "").toString().trim();

/* A plain response for the paths a person should never reach. The form has
 * required and minlength on every field it cares about, so a request that fails
 * validation here is a bot or a hand-rolled POST, and neither needs a designed
 * page. */
const plain = (status, message) =>
  new Response(message + "\n", {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return plain(400, "Expected a form submission.");
  }

  /* The honeypot. A real field, hidden from people off-screen rather than with
   * display:none — a field that is not rendered is not submitted, and the trap
   * stops working. Anything that fills it in is not a person.
   *
   * Answered with 303 to the thank-you page rather than an error, because an
   * error tells whoever is probing exactly which field the trap is. */
  if (field(form, "company")) {
    return Response.redirect(new URL("/contact/thanks/", request.url), 303);
  }

  const name = field(form, "name");
  const email = field(form, "email");
  const phone = field(form, "phone");
  const message = field(form, "message");

  if (!name || !email || !message) return plain(400, "Please fill in your name, email and message.");
  if (!looksLikeEmail(email)) return plain(400, "That email address does not look right.");
  if (message.length < 20) return plain(400, "Please say a little more about the project.");

  // Bounded so a script cannot post a novel into the studio's inbox.
  if (name.length > 120 || email.length > 200 || phone.length > 40 || message.length > 5000) {
    return plain(400, "That submission is longer than this form accepts.");
  }

  const key = env.ENQUIRY_ACCESS_KEY;
  if (!key) {
    // Loud in the logs, quiet to the visitor: they cannot fix this and should
    // not be shown the reason.
    console.error("[enquiry] ENQUIRY_ACCESS_KEY is not set — the enquiry was not sent");
    return plain(500, "The form is not available right now. Please email the studio directly.");
  }

  try {
    const ok = await send({ key, name, email, phone, message });
    if (!ok) return plain(502, "The form could not be sent. Please email the studio directly.");
  } catch (err) {
    console.error("[enquiry] send failed:", err && err.message);
    return plain(502, "The form could not be sent. Please email the studio directly.");
  }

  /* 303, not 302: it turns the POST into a GET, so the thank-you page can be
   * reloaded or bookmarked without the browser offering to submit again. */
  return Response.redirect(new URL("/contact/thanks/", request.url), 303);
}

/* Anything other than a POST — someone typing the URL in — belongs on the
 * contact page, not on a blank 405. */
export async function onRequest({ request }) {
  return Response.redirect(new URL("/contact/", request.url), 303);
}

/* --- the provider ---------------------------------------------------------
 * The only part that knows which service delivers the mail. Web3Forms: no DNS
 * records to add, which matters here because the practice's mail is already
 * running and its MX, SPF and DKIM records are not ours to touch.
 *
 * Returns true when the provider accepted it. */
async function send({ key, name, email, phone, message }) {
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      access_key: key,
      subject: `Enquiry from ${name} — btldesigns.in`,
      from_name: "btldesigns.in",
      // reply_to so hitting reply in the studio's mail client reaches the person
      // who wrote in, rather than the form service.
      replyto: email,
      name,
      email,
      phone: phone || "—",
      message,
    }),
  });
  if (!res.ok) return false;
  const body = await res.json().catch(() => null);
  return Boolean(body && body.success);
}
