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
   | `ENQUIRY_ACCESS_KEY` | *see below* | Lets the contact form send mail. **Is** a secret — mark it encrypted. |

   The Node version is not in this table on purpose. It is pinned in the
   repository, in `web/.node-version` and `web/package.json`, so it travels with
   the code and cannot drift out of step with a dashboard nobody has opened in
   six months. If a host ever ignores that file, `NODE_VERSION=26` as an
   environment variable does the same job.

4. **Save and deploy.** The first build takes a few minutes because it installs
   from scratch. Later ones are quicker.

---

## The contact form

The form posts to `/api/enquiry`, which is a small function that runs on
Cloudflare's own network — the code is in `web/functions/api/enquiry.js`. It
checks the submission, then hands it to a form service that emails the studio.

It works this way rather than posting straight to that service from the page for
two reasons. The site's security policy only permits forms to submit back to
this site, and relaxing that to allow a third party would trade a real
protection for a small convenience. And a key sitting in the page can be copied
by anyone who views the source and used to fill the studio's inbox with someone
else's spam. Posting to our own address keeps the policy shut and the key on the
server.

**To get the key:** sign up free at [web3forms.com](https://web3forms.com),
verify the email address, name the form, and it gives you an access key. Paste
that into Cloudflare as `ENQUIRY_ACCESS_KEY`. The free tier covers 250 enquiries
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

In Cloudflare Pages: **Settings → Builds → Deploy hooks → Add**. Name it
`Sanity publish` and copy the URL it gives you.

Then in Sanity: **Manage project → API → Webhooks → Create webhook**. Paste the
URL, set the trigger to *Create, Update, Delete*, and leave the filter empty so
any published change rebuilds.

Without this the site still works — it just won't notice new content until the
next push or a manual "Retry deployment".

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
