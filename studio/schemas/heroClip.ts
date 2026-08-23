import { defineField, defineType } from "sanity";

/* One clip in the opening sequence.
 *
 * The home page opens with a short authored cut — the land, the building in the
 * land, the rooms — and until now that sequence was three files sitting in the
 * repository. It is the most prominent thing on the site and the practice could
 * not change a frame of it without a developer, which is precisely the kind of
 * dependency the CMS exists to remove.
 *
 * Two encodings per clip, because a phone held upright and a laptop want
 * genuinely different framing, not the same frame letterboxed. The poster is
 * what a visitor sees before any video has loaded, and under reduced motion or
 * Save-Data it is *all* they ever see — so it has to be a frame worth looking
 * at on its own, not an arbitrary grab.
 */
export default defineType({
  name: "heroClip",
  title: "Opening clip",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Caption",
      type: "string",
      description: 'Set quietly in the corner while the clip plays — "Wayanad, first light".',
      validation: (r) => r.max(48),
    }),
    defineField({
      name: "video",
      title: "Film (landscape)",
      type: "file",
      options: { accept: "video/mp4" },
      description: "MP4, H.264, roughly 9 seconds. Keep it under about 2 MB.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "videoPortrait",
      title: "Film (portrait)",
      type: "file",
      options: { accept: "video/mp4" },
      description:
        "Optional. A version framed for a phone held upright. Without one, phones get the landscape cut.",
    }),
    defineField({
      name: "poster",
      title: "Still frame",
      type: "image",
      description:
        "Shown before the film loads, and instead of it for anyone who has asked their device to reduce motion. Choose a frame that stands on its own.",
      validation: (r) => r.required(),
    }),
  ],
  preview: { select: { title: "label", media: "poster" } },
});
