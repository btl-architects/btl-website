import { defineField, defineType } from "sanity";

/* A project.
 *
 * Note what is NOT here: no alignment, no band height, no column span, no
 * "layout" field of any kind. The projects index derives its arrangement from
 * the work itself. An editor who could set alignment per project would, within a
 * year, have produced a page with no rhythm — and no way to fix it centrally.
 *
 * Note also that `lifecycle` and `workStatus` are different questions.
 * Lifecycle is "should the public see this"; workStatus is "is the building
 * finished". A completed building can be unpublished and an in-progress one can
 * be published, and conflating them is how sites end up leaking unbuilt work.
 */
export default defineType({
  name: "project",
  title: "Project",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "images", title: "Photographs" },
    { name: "meta", title: "Details" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "content",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "content",
      description:
        "The project's web address. Generated from the title on first save and then left alone — changing it breaks every link that already points here, including any a publication has printed.",
      options: {
        source: "title",
        maxLength: 96,
        // `type` and `place` are reserved so a project can never collide with a
        // category or location route.
        isUnique: async (slug, ctx) => {
          if (["type", "place"].includes(slug)) return false;
          const { document, getClient } = ctx;
          const client = getClient({ apiVersion: "2024-10-01" });
          const id = document?._id.replace(/^drafts\./, "");
          const taken = await client.fetch<boolean>(
            `count(*[_type=="project" && slug.current==$slug && !(_id in [$id, "drafts."+$id])]) > 0`,
            { slug, id },
          );
          return !taken;
        },
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "description",
      title: "About the project",
      type: "text",
      rows: 4,
      group: "content",
      description:
        "One short paragraph, in the practice's voice. What the site asked for and what the building does about it.",
      validation: (r) => r.max(600),
    }),
    defineField({
      name: "category",
      type: "array",
      group: "meta",
      of: [{ type: "reference", to: [{ type: "category" }] }],
      description:
        "Categories are content, not code. The filter bar on the projects page appears by itself once two categories each hold three published projects.",
      validation: (r) => r.required().min(1),
    }),
    defineField({
      name: "location",
      type: "string",
      group: "meta",
      description: "Where it is — “Thirunelly, Wayanad”.",
      validation: (r) => r.required(),
    }),
    defineField({ name: "year", type: "number", group: "meta", validation: (r) => r.min(1990).max(2100) }),
    defineField({
      name: "workStatus",
      title: "Is it built?",
      type: "string",
      group: "meta",
      options: {
        list: [
          { title: "Completed", value: "completed" },
          { title: "Under construction", value: "in-progress" },
          { title: "On hold", value: "on-hold" },
        ],
        layout: "radio",
      },
      initialValue: "completed",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "lifecycle",
      title: "Should the public see it?",
      type: "string",
      group: "meta",
      description: "Only Published projects appear on the site or in search results.",
      options: {
        list: [
          { title: "Draft — not on the site", value: "draft" },
          { title: "Published", value: "published" },
          { title: "Archived — off the site, kept here", value: "archived" },
        ],
        layout: "radio",
      },
      initialValue: "draft",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "featured",
      title: "Show on the home page",
      type: "boolean",
      group: "meta",
      initialValue: false,
    }),
    defineField({
      name: "order",
      title: "Position in the index",
      type: "number",
      group: "meta",
      description: "Lower numbers come first.",
      initialValue: 0,
    }),
    defineField({ name: "credits", type: "credits", group: "meta" }),
    defineField({
      name: "images",
      title: "Photographs",
      type: "array",
      group: "images",
      of: [{ type: "figure" }],
      description:
        "In the order they should be seen. Exactly one must be marked Cover — it leads the project and is the frame already on screen when a card opens.",
      validation: (r) =>
        r.required().min(1).custom((images: any[] | undefined) => {
          const covers = (images ?? []).filter((i) => i?.kind === "cover").length;
          if (covers === 0) return "One photograph must be marked as the Cover.";
          if (covers > 1) return "Only one photograph can be the Cover.";
          return true;
        }),
    }),
    defineField({
      name: "related",
      title: "Related projects",
      type: "array",
      group: "meta",
      of: [{ type: "reference", to: [{ type: "project" }] }],
      validation: (r) => r.max(3),
    }),
    defineField({ name: "seo", type: "seo", group: "meta" }),
  ],

  orderings: [
    { name: "order", title: "Index order", by: [{ field: "order", direction: "asc" }] },
    { name: "recent", title: "Newest", by: [{ field: "year", direction: "desc" }] },
  ],

  preview: {
    select: { title: "title", location: "location", lifecycle: "lifecycle", media: "images.0.asset" },
    prepare: ({ title, location, lifecycle, media }) => ({
      title,
      subtitle: `${location ?? ""}${lifecycle !== "published" ? ` · ${lifecycle}` : ""}`,
      media,
    }),
  },
});
