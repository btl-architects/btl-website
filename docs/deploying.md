# Deploying the site

The site is a static build. Every page is rendered once, at build time, and
served as a plain file. Nothing queries Sanity when a visitor arrives, which is
why the site stays up and stays fast even if the CMS is having a bad day.

New content reaches the live site by **rebuilding**, not by saving. Publishing in
the Studio fires a webhook, the host rebuilds, and a minute or so later the page
is live.

It deploys to **Cloudflare Pages**. It used to be Netlify, and `netlify.toml` is
still here for published-content previews. Netlify does not run the Cloudflare
draft authentication middleware. Moving production back would require matching
authentication before draft previews, plus deployment and domain verification.

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

   Everything else is relative to it: the output directory is `dist`, not
   `web/dist`. Pages finds authentication middleware at `web/functions/`.
   The form posts directly to Web3Forms; it is not a Pages function.

3. **Environment variables** (Settings → Environment variables → Production).
   Preview needs the Sanity project and dataset, but no enquiry key. Draft
   previews also need `SANITY_PREVIEW_TOKEN`, `SANITY_PREVIEW=true` and runtime
   `PREVIEW_PASSWORD` (at least 16 characters). Never enable drafts on `main`.
   Netlify previews use published content only.

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
Cloudflare is building `main` or Netlify its production context (see `enquiryKey()` in
`web/server/build-mode.js`). Branch and draft-preview builds have no key, and
their form says it is unavailable without contacting anyone.

**To get the key:** sign up free at [web3forms.com](https://web3forms.com),
verify the email address, name the form, and it gives you an access key. Paste
that into Cloudflare as `ENQUIRY_ACCESS_KEY` (Settings → Variables and Secrets,
Production). It is read at **build** time, so a change to it takes effect on the
next deploy. Check the provider account for its current submission quota.

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

The delivery address belongs to the Web3Forms account. Changing `formTo` in
Sanity changes the email fallback shown on the page, not the provider recipient.
There is no `ENQUIRY_TO` override in this application.

**Working locally.** Astro development serves the browser form directly too.
No key means no request to Web3Forms. To check Pages middleware, headers and
redirects, run `npm run build`, then `npm run serve:test` from `web/`.
It serves http://127.0.0.1:8788. Restart it after each new build.

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
rebuild a site whose pages had not changed. Build allowances depend on the hosting account; check the dashboard.

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

`function-routes.mjs` generates `_routes.json` from the rendered build marker.
Published production pages/assets use Pages static delivery directly; only
`/build-status.json` invokes the marker guard. Public branch previews retain
middleware on all URLs for `noindex`; protected draft previews retain it for
authentication as well. Missing or inconsistent build-mode fields stop route
generation. The broad source `_routes.json` remains a defensive fallback.
`site-check.mjs` rejects generated coverage inconsistent with the marker.

The marker records `sourceSha`, `sourceDirty` and `builtAt`, alongside its mode.
Cloudflare supplies its commit SHA; a local build reads Git and reports dirty
source honestly. A marker identifies the source build, not whether external
CMS content has changed since that build.

---

## What the build refuses to ship

The build runs content validation, Astro type checking, static rendering,
minification, redirects, budgets and page integrity checks. Invalid output
fails the build, including unavailable optimized image assets:

- **`content-check.mjs`** — the content against the Studio's own rules: every
  photograph has alt text of a real length, a licence, and a valid role, and
  every published project has exactly one cover. It runs first, before anything
  is generated, because the cheapest failure is the early one.
- **`redirects.mjs`** — no broken or circular redirects.
- **`budget.mjs`** — page weight, CSS, JavaScript and fonts against fixed
  ceilings.
- **`cache-images.mjs`** — Sanity's optimized WebP image and zoom renditions are
  copied into static Cloudflare assets. Asset/crop/quality hashes identify them;
  unchanged files reuse `node_modules/.astro/btl-media-v1` when the host's Astro
  build cache is enabled. Cold caches download each rendition once. CDN failures
  block the new deployment rather than publishing broken photographs. Ready
  AVIF ladders serve opening photos with complete WebP fallbacks. Enable the
  Cloudflare Pages build cache to reuse this directory between hosted builds;
  GitHub checks restore and save it automatically.

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


## Canonical hostname

Until the custom domain is connected, metadata and sitemap URLs use
`https://btl-website-3wo.pages.dev`. After verifying the custom domain serves
this deployment over HTTPS, set `SITE_URL=https://btldesigns.in` in the host
build environment and rebuild. Use one preferred hostname and redirect its
`www` alternative. `SITE_URL` accepts a public HTTPS origin, not a subpath.
Website hostname records are separate from mail records; preserve all existing
MX, SPF, DKIM and DMARC records.
