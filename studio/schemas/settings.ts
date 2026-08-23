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
        "One or two lines about the people rather than the work — what it is like to deal with this practice. Leave it empty and the People page borrows the home page statement, which is about the practice rather than about the two of you.",
    }),
    defineField({
      name: "studioBody",
      title: "Studio paragraphs",
      type: "array",
      of: [{ type: "text", rows: 4 }],
      group: "studio",
      description: "Short editorial passages. Three reads best; more is fine.",
    }),
    defineField({ name: "studioImage", title: "Studio photograph", type: "figure", group: "studio" }),
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
