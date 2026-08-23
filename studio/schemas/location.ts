import { defineField, defineType } from "sanity";

/* A place.
 *
 * This exists because "Calicut" and "Kozhikode" are the same city, and when
 * location was a free-text field the site generated two separate place routes
 * for it — each holding a fraction of the work that belongs to one place. Free
 * text cannot be deduplicated after the fact; a reference cannot be duplicated
 * in the first place.
 *
 * `place` is a reserved URL segment, so a location can never collide with a
 * project slug.
 */
export default defineType({
  name: "location",
  title: "Location",
  type: "document",
  fields: [
    defineField({
      name: "label",
      title: "As it should be written",
      type: "string",
      description: 'How it appears on the site — "Thirunelly, Wayanad".',
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Web address",
      type: "slug",
      options: { source: "label", maxLength: 40 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "order",
      type: "number",
      initialValue: 0,
    }),
  ],
  orderings: [{ name: "order", title: "Order", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "label", subtitle: "slug.current" } },
});
