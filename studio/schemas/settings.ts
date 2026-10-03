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
    { name: "home", title: "Home page text" },
    { name: "studio", title: "The practice", default: true },
    { name: "copy", title: "Page wording" },
    { name: "contact", title: "Contact" },
    { name: "nav", title: "Navigation" },
    { name: "seo", title: "Search listings" },
  ],
  fields: [
    defineField({
      name: 'pageSeo', title: 'Search listings', type: 'object', group: 'seo',
      description: 'Optional search and sharing metadata. These fields do not change page headings or the studio’s writing. Leave a field empty to keep its current fallback.',
      fields: [
        defineField({name: 'home', title: 'Home', type: 'seo'}),
        defineField({name: 'projects', title: 'Projects index', type: 'seo'}),
        defineField({name: 'press', title: 'Press index', type: 'seo'}),
        defineField({name: 'people', title: 'People index', type: 'seo'}),
        defineField({name: 'studio', title: 'Studio', type: 'seo'}),
        defineField({name: 'contact', title: 'Contact', type: 'seo'}),
      ],
    }),
    defineField({ name: "name", type: "string", group: "studio", initialValue: "btl architects" }),
    defineField({ name: "domain", type: "string", group: "studio" }),
    defineField({ name: "tagline", type: "string", group: "studio", validation: (r) => r.max(120) }),
    defineField({
      name: "statement",
      title: "Home page statement",
      type: "text",
      rows: 3,
      group: "studio",
      description: "The statement the home page stops on. Leave a blank line between paragraphs; use Enter for a line break.",
    }),
    defineField({name: "homePeopleLead", title: "Home — People introduction", type: "text", rows: 5, group: "home",
      description: "Beside the founders photograph on Home only. Separate from the People page. Leave a blank line between paragraphs; use Enter for a line break."}),
    defineField({name: "homeStudioLead", title: "Home — Studio introduction", type: "text", rows: 5, group: "home",
      description: "Beside the studio photograph on Home only. Separate from the Studio page. Leave a blank line between paragraphs; use Enter for a line break."}),
    defineField({name: "homeStudioNote", title: "Home — Studio supporting text", type: "text", rows: 5, group: "home",
      description: "Optional quieter text below Home's Studio introduction. Separate from the Studio page's paragraphs. Leave a blank line between paragraphs."}),
    defineField({ name: "studioLead", title: "Studio page — introduction", type: "text", rows: 5, group: "studio",
      description: "Shown on the full Studio page only. Leave a blank line between paragraphs; use Enter for a line break." }),
    defineField({
      name: "peopleLead",
      title: "People page — introduction",
      type: "text",
      rows: 5,
      group: "studio",
      description:
        "Beside the team photograph on the full People page only. Separate from Home's founders introduction. Leave a blank line between paragraphs; use Enter for a line break. Leave empty to show the photograph on its own.",
    }),
    defineField({
      name: "studioBody",
      title: "Studio page — paragraphs",
      type: "array",
      of: [{ type: "text", rows: 4 }],
      group: "studio",
      description: "Shown on the full Studio page only. Each entry is a passage; blank lines within an entry separate its paragraphs.",
    }),
    defineField({
      name: "studioImages",
      title: "More photographs",
      type: "array",
      group: "studio",
      of: [{ type: "figure" }],
      description:
        "Shown after the writing, in the order given. The studio, the people in it, work in progress — whatever says what this practice is like to deal with. Leave it empty and the section does not appear.",
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
        "The line at the bottom of the People page, which leads to Studio. Default: “Inside the studio”",
      validation: (r) => r.max(80),
    }),
    defineField({
      name: "studioOnward",
      title: "Studio — closing line",
      type: "string",
      group: "copy",
      description:
        "The line at the bottom of the Studio page, which leads to Contact. Default: “Tell us what you want to build”",
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
        "Shown in the People section on the home page. This is separate from the team photograph on the People page. Use the original camera file for clear display on sharp screens; a WhatsApp copy may look soft.",
    }),
    defineField({
      name: "teamImage", title: "People page — team photograph", type: "figure", group: "studio",
      description: "The group photograph at the top of the People page. Crop excess headroom in the image editor and keep the whole team inside the frame. It does not replace the home page's founders photograph.",
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
            defineField({ name: "href", type: "string", description: "Page key, such as index, projects or projects/type/houses. No leading slash.",
              validation: r => r.required().regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/, {name: "a page key"}) }),
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
            defineField({ name: "label", type: "string", validation: r => r.required() }),
            defineField({ name: "url", type: "url", description: "Use the studio's profile address, not the platform homepage.",
              validation: r => [r.required().uri({scheme: ["https", "http"]}), r.custom(value => {
                if (!value) return true;
                try {const url = new URL(value); return !url.username && !url.password || "Use a public profile address without login credentials.";}
                catch {return "Enter a complete profile address.";}
              }), r.custom(value => {
                if (!value) return true;
                try {return new URL(value).pathname.replace(/\/+$/, "").length > 0 || "This points to the platform homepage. Add the studio's profile address.";}
                catch {return true;}
              }).warning()] }),
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
