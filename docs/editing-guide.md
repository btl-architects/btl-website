# Running your own website

Everything on btldesigns.in is yours to change — the projects, the photographs,
the people, the press, the words. Nothing needs a developer.

This guide is short on purpose. If something here is unclear, that is a fault in
the tool, not in you, and it is worth saying so rather than working around it.

---

## Getting in

Go to **sanity.io** and sign in with the btl account. You'll land in the Studio:
Projects, People, Press & awards, Categories, and Site settings down the side.

Two people can edit at the same time and you'll see each other's changes as they
happen. There is no "save" button — it saves as you type.

---

## The four things you'll actually do

### Add a project

**Projects → the pencil icon → Project**

1. **Title** — the name. The web address is generated from it automatically.
2. **About the project** — a short introduction, in your voice. What the site
   asked for, and what the building does about it.
3. **Category, location, year** — location is picked from the **Locations**
   list rather than typed. If the place isn't there yet, add it once and it's
   available to every project after.
4. **Photographs** — drag them in, in the order they should be seen. On each
   one:
   - **Alt text.** Describe the building for someone who can't see the picture.
     "Rammed earth walls under a terracotta roof", not "exterior 1".
   - **Licence.** Who owns it. This is the field that stops a magazine's
     photograph being reused by accident.
   - **Role.** Mark exactly one as the **Cover** — it's the frame the project
     leads with, and the one already on screen when a card opens.
     Use **Photograph** for the other finished-project photos, and **Drawing**
     for plans, sections or diagrams. These choices belong to project images;
     portraits and Press images do not need a project role.
   - Click the crop icon and drag the circle to what the photograph is *of*.
     Every size the site generates keeps that point in frame. You mark the
     subject; the site handles the geometry.
5. **Should the public see it?** → **Published**.

It's live on the next publish.

### Add someone to the team

**People → the pencil icon → Person**

Name, portrait, **Designation**, and **Where they appear**. Keep one record per
person. Anyone shown on People needs a designation:

- **Principal** — supplies Home and, when **Show in the People roster** is on,
  their portrait card in the team. **Show designation on Home** is off by default;
  it affects Home only. **Position beside the Home photograph** follows the
  photograph's left-to-right order, independently of roster ordering.
- **Team** — portrait cards below the team photograph
- **Alumni** — portrait cards in "Previously at btl", using the same treatment

After replacing a portrait, publish the person and wait for the website rebuild
to finish. Saving a draft alone does not change the public website.

To remove someone, turn off **Currently shown**. Don't delete them — switching
it off takes them off the site and keeps the record, so nothing that referred to
them breaks.

**The team list doesn't exist on the site until there is a real person in it.**
That's deliberate: an empty section looks broken, so it stays away until it has
something to hold.

### Record a feature or an award

**Press & awards → the pencil icon**

One entry type covers both — choose **Press feature** or **Award** at the top.

Add the publication's name, the headline, the date, and the link. Upload the
client's complete PNG under **Complete Press artwork**, with the photograph and
publication name already composed into it. A square canvas fits the card closely;
other proportions stay fully visible, without cropping or hover zoom. Transparent
areas show the website's dark background. Empty transparent outer padding is
removed automatically on rebuild; photographs, lettering and opaque borders
remain intact. The artwork retains its original colours.
Each entry can have its own image even when several entries feature the same project.

Generate its **Web address** before publishing. This supplies the reader URL in
all opening modes. If a published address changes later, its previous address
is automatically kept as a redirect. Old internal-ID addresses also redirect.

The website adds no separate publication logo: the feature, project and year
caption remains beneath the artwork. To replace it, change **Complete Press
artwork** and publish. The public site shows it after the next successful rebuild;
publishing does not change the public image instantly.

**Related project** supplies the project name and context. **Use the project
photograph if there is no Press image** is an explicit fallback: older entries retain
it for compatibility, while new entries start with it off. A Press image always
takes priority.

**How the article opens** is a separate choice for every entry:

- **BTL reader** opens a reading panel on Home or Press. Add text and full-frame
  photographs or scanned magazine pages under **Article content**, in reading
  order. A byline is optional. The original address becomes a source link;
  an address alone cannot supply the reader content. Text or a magazine page is
  required before publishing this mode.
- **Embedded publisher page** opens the same panel with the publisher's actual
  website inside it. Add its HTTPS address, then check the published result.
  The publisher's typography, advertisements and cookie prompts remain theirs.
  Some publishers block embedding, including Architectural Digest at the time
  of this implementation. Choose BTL reader or a new tab for those publishers.
  An **Open original** link is always available if a frame stops working.
- **Feature preview** shows the artwork and feature details in the same reading
  panel, with a link to read the original in a new tab. Existing entries use this
  mode until you choose another. Every mode uses the same opening, closing and
  return-to-page behaviour; only the content inside changes.

Changing modes preserves the article content. Each linked feature
also has its own BTL page; opening in a new tab, sharing the link, or disabling
JavaScript still leaves a usable destination. Close, Escape (when focus is in
BTL), or browser Back dismisses the panel and restores the page position.
Keyboard events inside a publisher's frame belong to that publisher, so use the
visible **Close** control to return to BTL from an embedded page.
Previously shared article pages remain available when you switch to a feature
preview. Only BTL reader versions are included in the search sitemap; publisher
frames and external-link previews stay out of search results.

The publication name remains required for the reader header and accessible card
label, even when its lettering is already included in the PNG.

To remove a dummy Press entry, open that entry, use the document's **…** menu,
choose **Delete**, and confirm the deletion. Published entries disappear from the
website after the next successful rebuild. Delete only the entry you intend to
remove; this does not delete its related project or uploaded assets.

### Arrange people or projects

**Site settings → The practice** has two independent image slots:
**Founders photograph** is for Home; **People page — team photograph** is for
the People page. Use Sanity's crop controls to remove excess headroom while
keeping everyone visible. The original uploaded image is preserved. Desktop
Team and Alumni rows hold three portraits; narrow screens hold two.

Open **Arrange people** or **Arrange projects** in the sidebar. Drag the ↕
handles, use **Move up / Move down**, or focus a handle and press the arrow keys.
Principals shown in the roster move with Team; Alumni remain separate. Hidden records stay in the list
so they keep their position if shown again.

Choose **Publish order** to save positions. It changes only order values, leaving
unfinished text, images and other edits unpublished. New records still need to
be published in their own editor. Existing drafts receive the same position so
publishing them later keeps the arrangement. The public website changes after
the next successful rebuild.

Use **Discard changes** to undo an arrangement before publishing it. If another
editor changes the list, publishing stops with a message; use **Reload list** and
arrange it again. Publish or discard before leaving this view.

### Change the opening film

**Site settings → The practice → The opening sequence**

The home page opens with three short clips that cycle quietly. Each one needs:

- **Film (landscape)** — MP4, around nine seconds, under about 2 MB
- **Film (portrait)** — optional, framed for a phone held upright. Without one,
  phones get the landscape cut
- **Still frame** — what shows before the film loads, *and* what anyone who has
  asked their device to reduce motion sees instead of it. Pick a frame that
  stands on its own
- **Caption** — the quiet line in the corner

Reorder them by dragging. Three is the right number; one works, more than four
is a wait rather than an opening.

### Change the words

**Site settings** holds everything that isn't a project or a person:

- **Home page text** — the People introduction beside the founders photograph,
  the Studio introduction and its supporting text, shown only on Home
- **The practice** — the home page statement, the Studio page introduction and
  paragraphs, the People page introduction, the studio, founders and team photographs
- **Page wording** — the footer line, the Press headline, the closing lines on
  People and Studio, the 404 message
- **Contact** — address, email, phone, where enquiries are delivered, GSTIN
- **Navigation** — the menu items and the social links

The current page order is Home → Projects → Press → People → Studio → Contact.
Home follows the same People → Studio sequence. The closing links lead from
Press to People, People to Studio, and Studio to Contact; edit their wording
under **Page wording**.

Home's People and Studio writing is independent of the full pages. Edit the
fields under **Home page text** for Home, and the fields labelled **People page**
or **Studio page** under **The practice** for the full pages. Clearing a Home
introduction does not borrow text from another page.

Leave a blank line between paragraphs in text fields. Press Enter once for a
line break within a paragraph. The website preserves this formatting in
introductions, Studio passages, biographies, project descriptions and Press
introductions. Press article bodies also support paragraphs, lists and headings
through their existing rich-text editor.

On desktop, browse Studio and project photographs with the arrows, a horizontal
trackpad gesture, or by holding a photograph and dragging left or right. Normal
up-and-down wheel scrolling moves the page, including when the pointer is over
a photograph. A click opens the image; a drag moves the gallery. Phones retain
swipe scrolling.

Clear any of the **Page wording** fields and it goes back to the written
default. You can't leave a blank space by emptying a box.

### Give someone their own page

Write a **bio** for them. That's the whole trigger — a person with a bio gets a
page at `/people/their-name`, and their name on the People page becomes a link
to it. Remove the bio and both disappear.

A page holding only a name and a job title is worse than no page, which is why
it works this way round.

### Move a page without breaking links

**Redirects → the pencil icon**

If a page's address genuinely has to change, add a redirect from the old address
to the new one. Anyone following an old link — including one printed in a
magazine — lands in the right place.

The site checks these when it builds and **refuses to publish a broken set**: a
redirect pointing at a page that doesn't exist, a loop, a duplicate, or one that
would shadow a real page all stop the build with a message saying which.

---

## Seeing a change before it goes live

Publishing puts a change on the public site. To look at unpublished work first,
open the **preview address** (your developer will give you one — it is a
separate web address from the real site).

Preview shows **drafts**: anything you have edited but not published. Every page
there carries a red bar across the top saying so, and search engines are told to
ignore it. If you can't see the red bar, you are looking at the live site.

---

## What the site does on its own

Nobody has to remember to switch these on.

| | |
|---|---|
| **The category filter** | Appears once two categories each hold three published projects. Below that, the index is simply all the work — which at four projects is the right answer anyway. |
| **A new category** | Shows up when it has published work in it. You can create *Commercial* today and it waits quietly until next year. |
| **The team list** | Appears when there are real names in it. |
| **Empty sections** | Don't render. A section with nothing in it is never shown half-built. |
| **Profile pages** | Appear when a person has a bio. |
| **Locations** | Picked from a list, not typed — so one city can't arrive spelled two ways and split its work across two pages. |

---

## Three rules the system won't let you break

These are enforced rather than documented, because documentation doesn't survive
a busy week.

1. **Every photograph needs alt text.** 8 characters minimum. A picture with no
   description is unusable to anyone browsing with a screen reader.
2. **Every photograph needs a licence.** The Nelly House photographs belong to
   the magazine, not to you, and this field is what keeps that visible.
3. **Exactly one cover per project.** Not zero, not two.

If a document won't publish, it's one of these. The Studio tells you which.

---

## Publishing, and undoing

Changes are **Draft** until you hit **Publish**. Drafts are never on the public
site, so it's safe to leave something half-written.

Every document keeps its full history. **Click the clock icon** at the top of
any document to see every past version and restore one. Nothing you do is
permanent, and nothing is lost by experimenting.

A published change reaches the live site within a couple of minutes — the site
rebuilds itself. If you don't see it immediately, wait a minute and refresh
before assuming it's broken.

---

## One thing to be careful with

**The web address of a published project should not change.** It's generated
from the title on first save and then left alone. If you rename *Nelly House*
to something else, the page keeps its original address — that's on purpose.
Every link anyone has ever shared to it, including one a magazine printed, keeps
working.

If an address genuinely must change, that's a five-minute job for a developer to
do properly with a redirect. Don't force it by deleting and re-creating the
project.

---

## What's still needed from you

The site is built and works. These are the gaps only you can close:

- Real names, locations, years and a paragraph each for **Houses Two, Three and
  Four** — they're published on their photographs, but they're literally titled
  "House Two"
- **Bios for both principals**
- **The four team members' real names and roles**
- **Written permission for the Nelly House photographs** from the magazine and
  the photographer
- **Your LinkedIn and YouTube addresses** — they currently point at those sites'
  home pages
- **Distinct introductions for Home and the People page** — Home introduces
  the founders; the full People page introduces the team


## A complete BTL reader article

Choose **BTL reader** on the Press entry. The introduction sits beneath the
headline. **Article opening photograph** is independent of the complete card
PNG; if empty, it uses the related project's cover. Add the body in reading
order with paragraphs, headings, lists, photographs and pull quotes.
Photographs retain their complete frame, with captions and image credits beneath
it. **Article credits** closes the article.

Feature/project/year is centered beneath the photograph inside the complete
card artwork. Place the Sanity image hotspot at the photograph’s centre to align
it on Home and Press. The complete PNG, including the logo and transparent
margins, remains visible. Trim unnecessary space below the logo in the source
artwork if needed; the website never cuts off the logo.

The AD and ELLE headlines, dates and writers were verified against their
publisher pages on 2 October 2026. Both readers use brief, original summaries
with three project photographs each, clear summary labels, original writer
credits and links to the complete publisher articles. Full article text and
publisher-written image captions were removed after the client chose summaries.
**Reader content** distinguishes project notes, summaries and articles supplied
for republication. **Original article writer** credits the publisher’s writer;
**Article byline** credits the author of the content shown here. Use article
mode only when the studio has permission to republish the text. New entries
default to summary content. Attribute a pull quote
to a person only when the wording is verified.

Embed uses the same panel but keeps the publisher's appearance. A publisher can
block framing now or later; the visible original link remains available and
closing restores BTL. BTL reader stays readable independently of framing policy.

## Image clarity on sharp screens

Upload camera originals rather than screenshots or WhatsApp copies. The website
now supplies larger responsive files up to 4000px when the source supports them,
with higher-quality compression and requests matched to gallery and card sizes.
It never enlarges a small upload or invents detail. Sanity warns about the usable
resolution **after cropping**; the warning does not block a small portrait.

The founders photograph was replaced with the supplied 4640 × 6960px camera
original on 3 October 2026, cropped above the feet. Names below it follow the
photograph: Faizan on the left, Thressia on the right. Change that order through
**Arrange people → Principals** when replacing the photograph. To replace it
later, use **Site settings → Studio → Founders photograph → Image**. Aim for at
least 2000px on the long side and 1200px on the short side after cropping. The
website automatically uses the extra detail after publishing and rebuilding.

## Uploading opening films

Open **Site settings → The practice → The opening sequence**. New clips default
to **Automatic processing (Mux)**. Upload the original landscape video; Mux
converts and compresses it into a web-ready MP4 up to 1080p. You can upload a
separate portrait film framed for a phone, with the same duration. This processes
video format and resolution; it does not invent a portrait crop or edit the film.
Add matching still frames. Wait for the optimised MP4 to finish before publishing;
the editor blocks an unfinished film. If it stays pending after processing,
refresh the asset in **Videos**. Publishing rebuilds the website.

Existing clips keep **Prepared MP4** until you explicitly switch them. In this
mode, export H.264, web optimisation / fast start and no audio; aim under 3 MB for
landscape and under 1 MB for a 720×1280 portrait. These file uploads are not
converted. Switching modes keeps the old source available for reverting.

Each clip plays to its end before advancing. The sequence repeats; if there is
only one clip, it loops. Films play muted, pause offscreen or in a hidden tab,
and reduced-motion / Save-Data visitors see the still instead. The website uses
its own lightweight player with the optimised MP4, without Mux analytics scripts.

### Connecting BTL's Mux account once

1. Create a **Production** environment named **btl-website** in BTL's Mux account.
2. In [API access tokens](https://dashboard.mux.com/settings/access-tokens),
   create **Sanity Studio** for that environment with **Video: Read and Write**
   and **Data: Read**. System permissions are not needed for public films.
3. Open **Videos** in [Sanity Studio](https://btldesigns.sanity.studio/) and enter
   the token ID and secret in its configuration screen. Keep public playback
   enabled and signed playback disabled. Do not paste the secret into messages
   or put it in website code. The official plugin stores it in the editor-only
   `secrets.mux` record; public builds fetch only playback information.
4. Upload a clip through the automatic field, wait for its MP4 to complete and
   publish. Check it on desktop and a phone. Existing file clips stay unchanged.

The integration uses Mux Basic processing and a standard highest MP4 rendition.
It does not request premium processing or additional advanced MP4 resolutions.
Account limits and charges are governed by [Mux's current plan](https://www.mux.com/pricing);
review them when selecting or upgrading a plan. Mux is a separate service from
Sanity's image optimisation.

### Phone interaction cues

Phone layouts keep the green link line visible only on text links that lead
further into the site (onward links, previous/next project, linked people,
links inside a sentence), and add small arrow labels to project and Press cards. Gallery photographs show a full-view symbol. These are
shared interface cues, so new Sanity entries receive them automatically. Mouse
layouts keep their hover treatment. Individual project pages place the same
project description below the photographs on phones, so longer text stays readable.
