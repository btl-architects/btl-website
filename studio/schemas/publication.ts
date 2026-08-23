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
      name: "logo",
      title: "Masthead",
      type: "figure",
      description:
        "Optional. Without it the name is set typographically at display scale, which is a designed state — the page never looks unfinished for want of a logo.",
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
        "Ties the recognition to the project. Its photograph rises behind the masthead on hover.",
    }),
  ],
  orderings: [{ name: "date", title: "Newest", by: [{ field: "date", direction: "desc" }] }],
  preview: {
    select: { title: "publication", subtitle: "title", media: "logo.asset", kind: "kind" },
    prepare: ({ title, subtitle, media, kind }) => ({
      title: `${title}${kind === "award" ? " · award" : ""}`,
      subtitle,
      media,
    }),
  },
});
