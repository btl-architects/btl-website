import { defineField, defineType } from "sanity";

/* A person.
 *
 * Tier drives the composition, not the editor: principals are the founders
 * photograph, Team and Alumni use the same portrait-card treatment.
 * `active` retires someone without deleting them, so the record — and anything
 * that references it — survives.
 */
export default defineType({
  name: "person",
  title: "Person",
  type: "document",
  fields: [
    defineField({ name: "prefix", type: "string", description: "“Ar.”, if they use one." }),
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "role", type: "string",
      description: "Optional for principals. Leave blank to show only their name below the founders photograph.",
      validation: (r) => r.custom((value, context) =>
        context.document?.tier === "principal" || (typeof value === "string" && value.trim())
          ? true : "Add a role for a team member or alumnus."),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      description: "Only needed if this person gets their own page.",
    }),
    defineField({
      name: "bio",
      type: "text",
      rows: 4,
      description: "Optional. Shown for principals.",
      validation: (r) => r.max(500),
    }),
    defineField({ name: "portrait", type: "figure" }),
    defineField({
      name: "tier",
      title: "Where they appear",
      type: "string",
      options: {
        list: [
          { title: "Principal — in the founders composition", value: "principal" },
          { title: "Team — in the list", value: "team" },
          { title: "Alumni — previously at btl", value: "alumni" },
        ],
        layout: "radio",
      },
      initialValue: "team",
      validation: (r) => r.required(),
    }),
    defineField({ name: "order", title: "Website position", type: "number", initialValue: 0,
      description: "Lower numbers appear first. Use Arrange people in the sidebar to drag entries into order." }),
    defineField({
      name: "active",
      title: "Currently shown",
      type: "boolean",
      description: "Turn off to remove someone from the site without deleting the record.",
      initialValue: true,
    }),
  ],
  orderings: [{ name: "order", title: "Order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "name", subtitle: "role", media: "portrait.asset", active: "active" },
    prepare: ({ title, subtitle, media, active }) => ({
      title: active ? title : `${title} (hidden)`,
      subtitle,
      media,
    }),
  },
});
