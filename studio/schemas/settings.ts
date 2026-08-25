import { defineField, defineType } from "sanity";

/* Site settings — one document, not a collection.
 *
 * Navigation, contact details, social links and the studio text all live here
 * because the contract forbids hard-coding any of them. Adding a nav
 * destination is an edit, not a deploy.
 */
export default defineType({
  name: "settings",
  title: "Site settings",
  type: "document",
  groups: [
    { name: "studio", title: "The practice", default: true },
    { name: "copy", title: "Page wording" },
    { name: "contact", title: "Contact" },
    { name: "nav", title: "Navigation" },
  ],
  fields: [
    defineField({ name: "name", type: "string", group: "studio", initialValue: "btl architects" }),
    defineField({ name: "domain", type: "string", group: "studio" }),
    defineField({ name: "tagline", type: "string", group: "studio", validation: (r) => r.max(120) }),
    defineField({
      name: "statement",
      title: "Home page statement",
      type: "text",
      rows: 3,
      group: "studio",
      description: "The single line the home page stops on.",
    }),
    defineField({ name: "studioLead", title: "Studio headline", type: "text", rows: 2, group: "studio" }),
    defineField({
      name: "peopleLead",
      title: "People headline",
      type: "text",
      rows: 2,
      group: "studio",
      description:
        "One or two lines about the people rather than the work — what it is like to deal with this practice. It used to borrow the home page statement when left empty, which meant the same paragraph ran on three pages; now the People page simply opens with the photograph instead.",
    }),
    defineField({
      name: "studioBody",
      title: "Studio paragraphs",
      type: "array",
      of: [{ type: "text", rows: 4 }],
      group: "studio",
      description: "Short editorial passages. Three reads best; more is fine.",
    }),
    defineField({
      name: "studioMethod",
      title: "How the practice works",
      type: "array",
      group: "studio",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Stage",
              type: "string",
              description: "Two or three words. “The first visit”, not “Phase 1: Discovery”.",
              validation: (r) => r.required().max(40),
            }),
            defineField({
              name: "body",
              title: "What happens",
              type: "text",
              rows: 3,
              description:
                "A sentence or two, in the practice's own voice. What a client actually experiences at this point — not a description of architecture in general.",
              validation: (r) => r.required().min(40).max(400),
            }),
          ],
          preview: { select: { title: "title", subtitle: "body" } },
        },
      ],
      description:
        "The home page links here promising “How the practice works”, and this is the answer. Three or four stages reads best. Leave it empty and the section does not appear — the page is then the statement and the photograph, which is honest but thin.",
    }),
    defineField({ name: "studioImage", title: "Studio photograph", type: "figure", group: "studio" }),
    defineField({
      name: "heroClips",
      title: "The opening sequence",
      type: "array",
      of: [{ type: "heroClip" }],
      group: "studio",
      description:
        "What the home page opens with, in order. It cycles quietly and cannot be clicked — it is atmosphere, not a carousel. Three clips is the right number; one works, and more than four is a wait rather than an opening.",
      validation: (r) => r.max(6),
    }),

    /* --- page wording ------------------------------------------------------
       The lines that carry the practice's voice rather than label the
       interface. Buttons, field labels and section headings stay in the code
       where they belong; these do not, because they are things the studio may
       genuinely want to say differently. Every one falls back to a sensible
       default when empty, so clearing a field never leaves a blank page. */
    defineField({
      name: "footerCta",
      title: "Footer line",
      type: "string",
      group: "copy",
      description: "The large line at the foot of every page. Default: “Let’s build something that lasts.”",
      validation: (r) => r.max(80),
    }),
    defineField({
      name: "locationLabel",
      title: "Location, as shown in the footer",
      type: "string",
      group: "copy",
      description: "Default: “Kozhikode, Kerala”.",
    }),
    defineField({
      name: "projectsLead",
      title: "Projects headline",
      type: "string",
      group: "copy",
      description:
        "One line under the Projects title. Default: “Houses, interiors and the occasional commercial project, across Kerala.”",
      validation: (r) => r.max(120),
    }),
    defineField({
      name: "pressLead",
      title: "Press headline",
      type: "string",
      group: "copy",
      description: "Default: “See where we’ve been.”",
      validation: (r) => r.max(80),
    }),
    defineField({
      name: "peopleOnward",
      title: "People — closing line",
      type: "string",
      group: "copy",
      description:
        "The line at the bottom of the People page, which now leads to Contact. Default: “Tell us what you want to build”",
      validation: (r) => r.max(80),
    }),
    defineField({
      name: "studioOnward",
      title: "Studio — closing line",
      type: "string",
      group: "copy",
      description:
        "The line at the bottom of the Studio page, which now leads to People. Default: “The people behind it”",
      validation: (r) => r.max(80),
    }),
    defineField({
      name: "notFoundLead",
      title: "404 page line",
      type: "string",
      group: "copy",
      description: "Shown when a visitor lands on a page that does not exist.",
      validation: (r) => r.max(120),
    }),
    defineField({
      name: "foundersImage",
      title: "Founders photograph",
      type: "figure",
      group: "studio",
      description:
        "Carries the People page. A portrait frame with room above the founders — their names are set into the architecture in the upper half, so leave that area uncluttered.",
    }),

    defineField({
      name: "nav",
      type: "array",
      group: "nav",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", type: "string", validation: (r) => r.required() }),
            defineField({ name: "href", type: "string", validation: (r) => r.required() }),
          ],
          preview: { select: { title: "label", subtitle: "href" } },
        },
      ],
    }),
    defineField({
      name: "social",
      type: "array",
      group: "nav",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", type: "string" }),
            defineField({ name: "url", type: "url" }),
          ],
          preview: { select: { title: "label", subtitle: "url" } },
        },
      ],
    }),

    defineField({
      name: "address",
      type: "array",
      of: [{ type: "string" }],
      group: "contact",
      description: "One line per line.",
    }),
    defineField({ name: "email", type: "string", group: "contact" }),
    defineField({
      name: "formTo",
      title: "Enquiries go to",
      type: "string",
      group: "contact",
      description: "Where the contact form delivers.",
    }),
    defineField({ name: "phone", type: "string", group: "contact" }),
    defineField({ name: "phoneHref", title: "Phone (dialable)", type: "string", group: "contact" }),
    defineField({ name: "gstin", type: "string", group: "contact" }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
