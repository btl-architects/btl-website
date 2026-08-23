import { defineField, defineType } from "sanity";

/* Shared objects.
 *
 * `figure` is the only way an image enters the system. Every image everywhere on
 * the site is one of these, which is what makes it possible to enforce alt text
 * and rights in exactly one place instead of five.
 */

export const figure = defineType({
  name: "figure",
  title: "Photograph",
  type: "object",
  fields: [
    defineField({
      name: "asset",
      title: "Image",
      type: "image",
      // The hotspot is how an editor art-directs a crop without being given
      // crop controls: they mark what the picture is *of*, and every derived
      // size keeps that point in frame. Editors choose the subject; the system
      // chooses the geometry.
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "alt",
      title: "Alt text",
      type: "string",
      description:
        "What the photograph shows, for someone who cannot see it. Describe the building, not the file — “rammed earth walls under a terracotta roof”, not “exterior 1”.",
      // Not optional, ever. An image with no alt is unusable to a screen
      // reader, and the site's Figure component refuses to render one.
      validation: (r) => r.required().min(8).max(160),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
      description: "Optional. Shown under the photograph on a project page.",
    }),
    defineField({
      name: "credit",
      title: "Photographer",
      type: "string",
      description: "Who took it. Appears in the project's credits.",
    }),
    defineField({
      name: "rights",
      title: "Licence",
      type: "string",
      description:
        "Who owns this photograph and on what terms. Publishing is blocked without it — the AD photographs are Condé Nast's, and this is the field that stops one being used by accident.",
      options: {
        list: [
          { title: "btl owns it", value: "owned" },
          { title: "Client supplied", value: "client-supplied" },
          { title: "Licensed from photographer", value: "licensed" },
          { title: "Publication owns it — do not reuse", value: "publication" },
        ],
        layout: "radio",
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "kind",
      title: "Role in the project",
      type: "string",
      description: "The cover is the frame the project leads with.",
      options: {
        list: [
          { title: "Cover", value: "cover" },
          { title: "Photograph", value: "photograph" },
          { title: "Drawing", value: "drawing" },
        ],
        layout: "radio",
      },
      initialValue: "photograph",
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { media: "asset", title: "alt", subtitle: "kind" },
  },
});

export const credits = defineType({
  name: "credits",
  title: "Credits",
  type: "object",
  fields: [
    defineField({ name: "architect", type: "string", initialValue: "btl architects" }),
    defineField({ name: "photographer", type: "string" }),
    defineField({
      name: "collaborators",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
  ],
});

export const seo = defineType({
  name: "seo",
  title: "Search listing",
  type: "object",
  description: "Optional. Leave empty and the page uses its own title and opening lines.",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.max(60) }),
    defineField({ name: "description", type: "text", rows: 2, validation: (r) => r.max(155) }),
  ],
});
