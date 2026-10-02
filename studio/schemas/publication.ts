import { defineField, defineType } from "sanity";

/* Press and awards are ONE type with a `kind`, never two systems.
 *
 * A separate "award" type would duplicate every field and then drift — a page
 * that has to merge two feeds to show one wall is a page that will eventually
 * show them inconsistently.
 */
export default defineType({
  name: "publication",
  title: "Press & awards",
  type: "document",
  fields: [
    defineField({
      name: "kind",
      type: "string",
      options: {
        list: [
          { title: "Press feature", value: "press" },
          { title: "Award", value: "award" },
        ],
        layout: "radio",
      },
      initialValue: "press",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "publication",
      title: "Publication or awarding body",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({ name: "short", title: "Short name", type: "string", description: "“AD”." }),
    defineField({
      name: "image", title: "Complete Press artwork", type: "figure",
      description: "Upload the complete PNG with the photograph and publication name composed together. Transparent areas keep the website's dark background. The whole artwork is shown on Home and Press, without cropping or an extra logo underneath. A square canvas fits the card closely; other proportions remain fully visible.",
    }),
    defineField({
      name: "useProjectImage", title: "Use the project photograph if there is no Press image",
      type: "boolean", initialValue: false,
      description: "Optional fallback. Turn off for a text-only entry until its own image is ready. A Press image always takes priority.",
    }),
    defineField({ name: "title", title: "Headline", type: "string", validation: (r) => r.required() }),
    defineField({ name: "date", type: "date", options: { dateFormat: "D MMMM YYYY" } }),
    defineField({
      name: "openingMode", title: "How the article opens", type: "string",
      initialValue: "external",
      options: {layout: "radio", list: [
        {title: "BTL reader — text and images added here", value: "reader"},
        {title: "Embedded publisher page — where the publisher allows it", value: "embed"},
        {title: "Feature preview — link to the original article", value: "external"},
      ]},
      description: "All three choices open the same BTL reading panel. Choose BTL reader for article text and images, embed where the publisher allows it, or a feature preview with a link to read the original in a new tab. Embedded pages keep the publisher's own appearance and may be blocked.",
    }),
    defineField({
      name: "intro", title: "Article introduction", type: "text", rows: 3,
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "A short standfirst below the headline. Use your own project notes unless you have the publication's article text to republish.",
      validation: r => r.max(450),
    }),
    defineField({
      name: "articleHero", title: "Article opening photograph", type: "figure",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Separate from the PNG artwork used on the Press card. If empty, the article uses its related project's cover, then its Press artwork.",
    }),
    defineField({
      name: "articleCredits", title: "Article credits", type: "credits",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Design, photography and collaborators for this article. Only add verified credits.",
    }),
    defineField({
      name: "byline", title: "Article byline", type: "string",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Optional author or publication credit, shown below the headline.",
    }),
    defineField({
      name: "readerPublishedAt", title: "BTL reader publication date", type: "date",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Optional date these notes were published on BTL. Separate from the publication's feature date above; used for search metadata.",
    }),
    defineField({
      name: "readerContent", title: "Article content", type: "articleContent",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Add the article text, photographs or scanned magazine pages in reading order. Images display their full frame. Switching modes keeps this content saved.",
      validation: r => r.custom((value, context) => {
        if (context.document?.openingMode !== "reader") return true;
        const blocks = (value ?? []) as {_type?: string; children?: {text?: string}[]; asset?: {asset?: {_ref?: string}}}[];
        return blocks.some(b => b._type === "figure" ? Boolean(b.asset?.asset?._ref) :
          b._type === "block" && b.children?.some(s => s.text?.trim())) ||
          "Add article text or at least one magazine page for the BTL reader.";
      }),
    }),
    defineField({
      name: "url",
      type: "url",
      description: "The original publication address. Required for an external link or embedded page; optional for the BTL reader. Embedded pages need HTTPS and the publisher's permission to embed. Architectural Digest currently blocks embedding.",
      validation: (r) => [r.uri({ scheme: ["http", "https"] }), r.custom((value, context) => {
        if (value) {
          try {const url = new URL(value); if (url.username || url.password) return "Use a public article address without login credentials.";}
          catch {return "Enter a complete web address.";}
        }
        const mode = context.document?.openingMode;
        if (mode === "reader") return true;
        // Older records may intentionally have no link (for example an award).
        if (!value && (!mode || context.document?.kind === "award" && mode === "external")) return true;
        if (!value) return "Add the original article address.";
        if (mode === "embed" && !String(value).startsWith("https://")) return "Embedded articles need an HTTPS address.";
        return true;
      })],
    }),
    defineField({
      name: "relatedProject",
      title: "The work that earned it",
      type: "reference",
      to: [{ type: "project" }],
      description:
        "Names the project this feature or award is about. It does not replace the Press image.",
    }),
  ],
  orderings: [{ name: "date", title: "Newest", by: [{ field: "date", direction: "desc" }] }],
  preview: {
    select: { title: "publication", subtitle: "title", media: "image.asset", kind: "kind" },
    prepare: ({ title, subtitle, media, kind }) => ({
      title: `${title || "Untitled entry"}${kind === "award" ? " · award" : ""}`,
      subtitle,
      media,
    }),
  },
});
