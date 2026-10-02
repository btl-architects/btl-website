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
      name: "image", title: "Press image / magazine cover", type: "figure",
      description: "The main picture on Home and Press. Upload the magazine cover or a custom image; the whole image is shown. This is separate from the publication logo.",
    }),
    defineField({
      name: "useProjectImage", title: "Use the project photograph if there is no Press image",
      type: "boolean", initialValue: false,
      description: "Optional fallback. Turn off for a text-only entry until its own image is ready. A Press image always takes priority.",
    }),
    defineField({
      name: "logo",
      title: "Publication logo",
      type: "figure",
      description:
        "Optional small publication mark below the main picture. Upload transparent artwork; the website displays the mark in white. Put a full magazine cover in Press image instead. Without a logo, the publication name is shown.",
    }),
    defineField({ name: "title", title: "Headline", type: "string", validation: (r) => r.required() }),
    defineField({ name: "date", type: "date", options: { dateFormat: "D MMMM YYYY" } }),
    defineField({
      name: "url",
      type: "url",
      description: "Links out to the publication's own page.",
      validation: (r) => r.uri({ scheme: ["http", "https"] }),
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
    select: { title: "publication", subtitle: "title", media: "image.asset", logo: "logo.asset", kind: "kind" },
    prepare: ({ title, subtitle, media, logo, kind }) => ({
      title: `${title || "Untitled entry"}${kind === "award" ? " · award" : ""}`,
      subtitle,
      media: media || logo,
    }),
  },
});
