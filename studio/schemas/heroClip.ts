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
/* The size limits below were descriptions only, and an 11 MB 4K encode went in
 * under "keep it under about 2 MB" — every phone downloaded and decoded 4K to
 * show it on a 400px screen, and the home page failed its launch performance
 * check. A warning, not a block, so a film can still be published in a hurry;
 * but the editor is told, with the number, at the moment of upload. */
const filmSize = (limitMb: number, cut: string) => (r: any) =>
  r.custom(async (value: { asset?: { _ref?: string } } | undefined, context: any) => {
    const id = value?.asset?._ref;
    if (!id) return true;
    const bytes: number | null = await context.getClient({ apiVersion: "2025-02-19" })
      .fetch("*[_id == $id][0].size", { id });
    if (!bytes || bytes <= limitMb * 1024 * 1024) return true;
    return `This ${cut} film is ${(bytes / 1048576).toFixed(1)} MB. Every visitor downloads it before the opening moves, so keep it under ${limitMb} MB: 1080p (or 720×1280 for the portrait cut), H.264, "web optimised" / fast start, no audio.`;
  }).warning();

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
      validation: (r) => [r.required(), filmSize(3, "landscape")(r)],
    }),
    defineField({
      name: "videoPortrait",
      title: "Film (portrait)",
      type: "file",
      options: { accept: "video/mp4" },
      description:
        "Optional. A version framed for a phone held upright. Without one, phones get the landscape cut.",
      validation: (r) => filmSize(1, "portrait")(r),
    }),
    defineField({
      name: "poster",
      title: "Still frame",
      type: "image",
      description:
        "Shown before the film loads, and instead of it for anyone who has asked their device to reduce motion. Choose a frame that stands on its own.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "posterPortrait",
      title: "Still frame (portrait)",
      type: "image",
      description:
        "The matching first frame of the portrait cut. Without it a phone shows the landscape still and then starts playing the portrait film, and the picture visibly jumps as the framing changes underneath it.",
    }),
  ],
  preview: { select: { title: "label", media: "poster" } },
});
