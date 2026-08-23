import { defineField, defineType } from "sanity";

/* Categories are content. Nothing in the codebase hard-codes "houses".
 *
 * A category with no published work never appears; the filter bar itself only
 * appears once two categories each hold three published projects. So a category
 * can be created early and simply waits, rather than showing the practice an
 * empty page.
 */
export default defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({ name: "label", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "label", maxLength: 40 },
      validation: (r) => r.required(),
    }),
    defineField({ name: "order", type: "number", initialValue: 0 }),
  ],
  preview: { select: { title: "label", subtitle: "slug.current" } },
});
