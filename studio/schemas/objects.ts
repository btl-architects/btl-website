import { defineField, defineType } from "sanity";
import {imageResolutionWarning} from "./imageResolution.ts";

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
      // Small originals remain publishable, with guidance based on the crop.
      validation: (r) => [r.required(), r.custom(imageResolutionWarning).warning()],
    }),
    defineField({
      name: "alt",
      title: "Alt text",
      type: "string",
      description:
        "Describe what someone can see: a building, the person in a portrait, or the magazine name and subject on a cover. Use a short description, not a filename.",
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
      description: "Cover: the one opening image for this project. Photograph: another gallery photo. Drawing: a plan, section or elevation, shown in the same gallery. Choose exactly one Cover per published project.",
      hidden: ({ document }) => document?._type !== "project",
      options: {
        list: [
          { title: "Cover", value: "cover" },
          { title: "Photograph", value: "photograph" },
          { title: "Drawing", value: "drawing" },
        ],
        layout: "radio",
      },
      initialValue: "photograph",
      validation: (r) => r.custom((value, context) =>
        context.document?._type !== "project" || value ? true : "Choose Cover, Photograph or Drawing."),
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
