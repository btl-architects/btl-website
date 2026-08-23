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
2. **About the project** — one short paragraph, in your voice. What the site
   asked for, and what the building does about it.
3. **Category, location, year** — location is written as you'd say it,
   `Thirunelly, Wayanad`.
4. **Photographs** — drag them in, in the order they should be seen. On each
   one:
   - **Alt text.** Describe the building for someone who can't see the picture.
     "Rammed earth walls under a terracotta roof", not "exterior 1".
   - **Licence.** Who owns it. This is the field that stops a magazine's
     photograph being reused by accident.
   - **Role.** Mark exactly one as the **Cover** — it's the frame the project
     leads with, and the one already on screen when a card opens.
   - Click the crop icon and drag the circle to what the photograph is *of*.
     Every size the site generates keeps that point in frame. You mark the
     subject; the site handles the geometry.
5. **Should the public see it?** → **Published**.

It's live on the next publish.

### Add someone to the team

**People → the pencil icon → Person**

Name, role, and **Where they appear**:

- **Principal** — in the founders composition at the top of the People page
- **Team** — in the list, which reveals their portrait on hover
- **Alumni** — the "Previously at btl" list

To remove someone, turn off **Currently shown**. Don't delete them — switching
it off takes them off the site and keeps the record, so nothing that referred to
them breaks.

**The team list doesn't exist on the site until there is a real person in it.**
That's deliberate: an empty section looks broken, so it stays away until it has
something to hold.

### Record a feature or an award

**Press & awards → the pencil icon**

One entry type covers both — choose **Press feature** or **Award** at the top.

Add the publication's name, the headline, the date, and the link. If you can
tie it to **the work that earned it**, do: that project's photograph rises
behind the masthead when someone hovers it.

**A missing logo is fine.** The publication's name set large *is* the design,
not a placeholder. Add the logo whenever it turns up and nothing else moves.

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

- **The practice** — the home page statement, the Studio headline and
  paragraphs, the People headline, the studio and founders photographs
- **Page wording** — the footer line, the Press headline, the closing lines on
  People and Studio, the 404 message
- **Contact** — address, email, phone, where enquiries are delivered, GSTIN
- **Navigation** — the menu items and the social links

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
- **The founders photograph at full resolution** — what we have is a WhatsApp
  copy, fine at the size it's used but it can never be printed or run larger
- **Written permission for the Nelly House photographs** from the magazine and
  the photographer
- **Your LinkedIn and YouTube addresses** — they currently point at those sites'
  home pages
- **A People headline** — the People page currently borrows the home page
  statement. One or two lines about the two of you would be better
