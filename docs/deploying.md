# Deploying the site

The site is a static build. Every page is rendered once, at build time, and
served as a plain file. Nothing queries Sanity when a visitor arrives, which is
why the site stays up and stays fast even if the CMS is having a bad day.

New content reaches the live site by **rebuilding**, not by saving. Publishing in
the Studio fires a webhook, the host rebuilds, and a minute or so later the page
is live.

It deploys to **Cloudflare Pages**. It used to be Netlify, and `netlify.toml` is
still here and still correct — the move was made because Netlify's free plan
stopped allowing production deploys partway through a billing cycle, not because
anything was wrong with it. Going back is a matter of pointing DNS.

---

## Setting it up on Cloudflare Pages

Once, by hand. Everything after this is automatic.

1. **Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.**
   Pick the `btl-architects/btl-website` repository.

2. **Build settings.** These matter — particularly the root directory, because
   the site lives in a subfolder of the repository.

   | Setting | Value |
   | --- | --- |
   | Production branch | `main` |
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | **Root directory** | **`web`** |

   **The root directory is the one that actually catches people.** The site is
   in a subfolder, and there is no `package.json` at the top of the repository.
   Miss it and the build fails immediately with `Could not read package.json`
   and a path ending `/repo/package.json` — that path, without `web` in it, is
   the tell. In the dashboard it is under **Settings → Build → Build
   configuration**, and during first setup it is sometimes folded away behind
   the optional or advanced settings. Enter it as `web`, with no slashes.

   Everything else is relative to it: the output directory really is `dist`, not
   `web/dist`, and the contact form's function is found at `web/functions/`
   because of this setting. Getting it wrong is also what would make the form
   quietly 404 rather than fail loudly.

3. **Environment variables** (Settings → Environment variables → Production).
   Add the same three to Preview if you want branch builds to work.

   | Name | Value | What it is |
   | --- | --- | --- |
   | `SANITY_PROJECT_ID` | `aur12nrf` | Which Sanity project to read. Not a secret. |
   | `SANITY_DATASET` | `production` | Which dataset. Not a secret. |
   | `ENQUIRY_ACCESS_KEY` | *see below* | Lets the contact form send mail. Plain text is fine: it is written into the published contact page, so encrypting it would protect nothing. |

   The Node version is not in this table on purpose. It is pinned in the
   repository, in `web/.node-version` and `web/package.json`, so it travels with
   the code and cannot drift out of step with a dashboard nobody has opened in
   six months. If a host ever ignores that file, `NODE_VERSION=26` as an
   environment variable does the same job.

4. **Save and deploy.** The first build takes a few minutes because it installs
   from scratch. Later ones are quicker.

---

## The contact form

The form posts from the visitor's browser straight to Web3Forms, which emails
the studio. There is no server step of our own.

It used to go through a small relay on Cloudflare (`/api/enquiry`), to keep the
key off the page. That never worked in production: Web3Forms rate-limits by the
address a request comes from, and Cloudflare's servers share their outgoing
addresses with a great many other sites, so the relay was refused
`429 — IP temporarily blocked` on its first real enquiry. From the browser, the
address Web3Forms sees is the visitor's own.

**The trade-off, stated plainly:** the access key is now visible to anyone who
views the page source. Web3Forms is designed for that — its keys normally live
in public pages — and the worst anyone can do with it is send the studio
unwanted mail through Web3Forms. Web3Forms filters spam, and the form carries its
`botcheck` honeypot. If spam ever becomes a real problem, the next steps are
Web3Forms' captcha option, or moving to a provider that authenticates with a
secret key from a server.

**Previews never send real email.** The key is only written into the page when
Cloudflare is building the `main` branch (see `enquiryKey()` in
`web/server/build-mode.js`). Branch and draft-preview builds have no key, and
their form says it is unavailable without contacting anyone.

**To get the key:** sign up free at [web3forms.com](https://web3forms.com),
verify the email address, name the form, and it gives you an access key. Paste
that into Cloudflare as `ENQUIRY_ACCESS_KEY` (Settings → Variables and Secrets,
Production). It is read at **build** time, so a change to it takes effect on the
next deploy. The free tier covers 250 enquiries
a month, which is far more than this practice will receive.

> **Sign up with the address the enquiries should reach.** Web3Forms has no
> recipient parameter: it delivers to whichever email the account was registered
> with, and there is nothing in this repository that can override it. Sending
> anywhere else — CC'ing a second address — is a paid feature. So the account
> must be created as `admin@btldesigns.in`, because that is the address the
> contact page promises. Signing up with a personal address quietly sends the
> studio's enquiries somewhere the website says they do not go.
>
> If the account already exists on the wrong address, change the email on the
> Web3Forms account rather than looking for a setting here.

No DNS records are involved — deliberately. The studio's email is already
running, and its MX, SPF and DKIM records are not ours to touch.

**Until that key is set,** the form will accept a submission and then show a
short message telling the visitor to email the studio directly. It fails in the
open, honestly, rather than pretending to have sent something.

Where enquiries land can be changed without touching code, with an optional
`ENQUIRY_TO` variable.

**Working on it locally.** `npm run dev` serves the pages but not the function —
Astro's dev server knows nothing about Cloudflare — so submitting the form there
gives a 404. To exercise it for real, build first and then run Cloudflare's own
local server:

```
npm run build
npx wrangler pages dev dist
```

That serves the site at `localhost:8788` with the function live, the headers
applied and the redirects working, which is as close to production as it gets
without deploying.

---

## Rebuilding when content changes

Publishing in the Studio does nothing to the live site on its own. This is the
wire between them, and it is set up once.

**1. Get the hook URL from Cloudflare.** Workers & Pages → the project →
**Settings → Builds → Deploy hooks → Add**. Name it `Sanity publish` and set the
branch to `main`. It gives you a long URL.

> Treat that URL like a password. Anyone who has it can start a build on this
> project, as many times as they like. It does not belong in the repository, in
> a chat message, or in a screenshot.

**2. Create the webhook in Sanity.** [sanity.io/manage](https://www.sanity.io/manage)
→ the `aur12nrf` project → **API → Webhooks → Create webhook**.

| Field | Value |
| --- | --- |
| Name | `Rebuild the site` |
| URL | the hook URL from step 1 |
| Dataset | `production` |
| Trigger on | Create, Update **and** Delete |
| Filter | leave empty — any published change should rebuild |
| Projection | leave empty |
| HTTP method | `POST` |
| **Drafts and versions** | **off** |
| Secret | leave empty — Cloudflare does not check one |

**Drafts off is the one that matters.** The Studio saves a draft every few
seconds while somebody is typing, and the site only ever reads published
content — so leaving it on would spend a build on every pause for thought, and
rebuild a site whose pages had not changed. The free plan allows 500 builds a
month; a practice publishing a project a week will use about four.

**3. Test it.** Change something small in the Studio and publish. A new
deployment should appear in Cloudflare within about half a minute, and the
change should be live a minute or so after that.

Without this the site still works — it just will not notice new content until
somebody pushes code or presses "Retry deployment" by hand.

---

## Headers and redirects

Neither lives in a host's config file any more. They are in:

- `web/public/_headers` — the security policy, including the CSP, and the cache
  rules.
- `web/public/_redirects` — the permanent redirects for the old `.html` URLs.

Both are in a format Netlify and Cloudflare Pages read identically, which is the
point: the security policy should not have to be retyped to change host. The
build appends the per-project redirects and any redirects set in the Studio to
`_redirects` afterwards, below the ones already there.

Because the build appends, **first match wins** and the hand-written rules come
first. `web/tools/redirects.mjs` refuses to build on a loop, a self-redirect, a
duplicate, or a redirect pointing at a page that does not exist.

---

## What the build refuses to ship

Four checks run on every build, and each one fails it rather than warning:

- **`content-check.mjs`** — the content against the Studio's own rules: every
  photograph has alt text of a real length, a licence, and a valid role, and
  every published project has exactly one cover. It runs first, before anything
  is generated, because the cheapest failure is the early one.
- **`redirects.mjs`** — no broken or circular redirects.
- **`budget.mjs`** — page weight, CSS, JavaScript and fonts against fixed
  ceilings.
- **`warm-images.mjs`** — every image size the site asks for is generated and
  cached before a visitor is the one waiting for it.

If a build fails, the message says which check and why. Nothing partial is ever
published: the previous version stays live.

---

## Pointing btldesigns.in at it

Only when the practice is ready to go live.

In Cloudflare Pages: **Custom domains → Set up a custom domain** → `btldesigns.in`,
and again for `www.btldesigns.in`. Cloudflare issues the certificate itself.

Add **only** the records it asks for — a `CNAME` for `www` and the apex record.
**Do not touch `MX`, `SPF`, `DKIM` or `DMARC`.** Those carry the studio's email,
they have nothing to do with the website, and changing one silently stops mail
arriving.
