import { defineField, defineType } from "sanity";
import {isSafeSlug} from "../../shared/slug.ts";

/* A person.
 *
 * Team and Alumni use portrait cards. Principal records are retained for
 * individual profiles; the removed founders list does not render them.
 * `active` retires someone without deleting them, so the record — and anything
 * that references it — survives.
 */
export default defineType({
  name: "person",
  title: "Person",
  type: "document",
  fields: [
    defineField({name: 'seo', title: 'Search listing', type: 'seo',
      description: 'Optional metadata for this person’s profile. Does not change their name, designation or biography, or create a profile on its own.'}),
    defineField({ name: "prefix", type: "string", description: "“Ar.”, if they use one." }),
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "role", type: "string",
      title:'Designation', description: "Shown beneath the name on People. Home has a separate visibility option.",
      validation: (r) => r.custom((value, context) =>
        context.document?.tier === "principal" && context.document?.showInTeam === false || (typeof value === "string" && value.trim())
          ? true : "Add a designation for anyone shown on People."),
    }),
    defineField({name:'showRoleOnHome',title:'Show designation on Home',type:'boolean',initialValue:false,
      description:'Turn off to show only the name on Home. The designation remains visible on People.'}),
    defineField({name:'showInTeam',title:'Show in the People roster',type:'boolean',initialValue:true,
      hidden:({document})=>document?.tier!=='principal',description:'The same principal record supplies both Home and their People card.'}),
    defineField({name:'homeOrder',title:'Position beside the Home photograph',type:'number',initialValue:0,
      hidden:({document})=>document?.tier!=='principal',description:'Lower numbers appear first; use the left-to-right order in the photograph.'}),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      description: "Only needed if this person gets their own page.",
      validation: (r) => r.custom(value => value == null || isSafeSlug(value.current) || "Use lowercase letters, numbers and single hyphens."),
    }),
    defineField({
      name: "bio",
      type: "text",
      rows: 4,
      description: "Optional. Creates an individual profile page when a slug is also present. Leave a blank line between paragraphs; use Enter for a line break.",
      validation: (r) => r.max(500),
    }),
    defineField({ name: "portrait", type: "figure" }),
    defineField({
      name: "tier",
      title: "Where they appear",
      type: "string",
      options: {
        list: [
          { title: "Principal — Home and People", value: "principal" },
          { title: "Team — portrait cards", value: "team" },
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
