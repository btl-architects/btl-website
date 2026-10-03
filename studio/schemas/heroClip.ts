import { defineField, defineType } from "sanity";
import {muxVideoUrl, type MuxVideoAsset} from "../../shared/video.ts";

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
    if (context.parent?.videoMode === "mux") return true;
    const id = value?.asset?._ref;
    if (!id) return true;
    const bytes: number | null = await context.getClient({ apiVersion: "2025-02-19" })
      .fetch("*[_id == $id][0].size", { id });
    if (!bytes || bytes <= limitMb * 1024 * 1024) return true;
    return `This ${cut} film is ${(bytes / 1048576).toFixed(1)} MB. Every visitor downloads it before the opening moves, so keep it under ${limitMb} MB: 1080p (or 720×1280 for the portrait cut), H.264, "web optimised" / fast start, no audio.`;
  }).warning();

const filmRequired = (mode: 'mux' | 'file') => (r: any) => r.custom((value: {asset?: {_ref?: string}} | undefined, context: any) =>
  (context.parent?.videoMode === 'mux' ? 'mux' : 'file') !== mode || value?.asset?._ref ? true : 'Upload a landscape film.');

const muxReady = (r: any) => r.custom(async (value: {asset?: {_ref?: string}} | undefined, context: any) => {
  if (context.parent?.videoMode !== 'mux' || !value?.asset?._ref) return true;
  const asset = await context.getClient({apiVersion: '2026-09-01'}).fetch(
    '*[_id == $id][0]{status, data{playback_ids[]{id,policy},static_renditions{files[]{status,name,ext}}}}', {id:value.asset._ref}) as MuxVideoAsset | null;
  return muxVideoUrl(asset) ? true : 'Wait for the optimised MP4 to finish processing before publishing. If it remains pending, refresh the video asset in Videos. Public playback and a highest MP4 rendition are required.';
});

export default defineType({
  name: "heroClip",
  title: "Opening clip",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Caption",
      type: "string",
      description: "An internal name for identifying this clip in the editor. It is not shown over the film.",
      validation: (r) => r.max(48),
    }),
    defineField({
      name: 'videoMode', title: 'Video processing', type: 'string',
      options: {list: [{title:'Automatic processing (Mux)',value:'mux'},{title:'Prepared MP4',value:'file'}], layout:'radio'},
      initialValue: 'mux',
      description: 'Automatic processing converts and compresses your upload through the connected Mux account. Existing clips keep their prepared MP4 until you switch this setting.',
    }),
    defineField({
      name: 'videoMux', title: 'Film (landscape)', type: 'mux.video',
      hidden: ({parent}) => parent?.videoMode !== 'mux',
      description: 'Upload the original video. Mux creates a web-ready MP4 up to 1080p. The whole clip plays before the next one starts. Connect the BTL Mux account using this field’s configuration button first.',
      validation: r => [filmRequired('mux')(r), muxReady(r)],
    }),
    defineField({
      name: 'videoPortraitMux', title: 'Film (portrait)', type: 'mux.video',
      hidden: ({parent}) => parent?.videoMode !== 'mux',
      description: 'Optional original video framed for a phone held upright. Mux converts and compresses it. Use the same duration as the landscape cut. Without one, phones use the landscape film.',
      validation: muxReady,
    }),
    defineField({
      name: "video",
      title: "Film (landscape)",
      type: "file",
      hidden: ({parent}) => parent?.videoMode === "mux",
      options: { accept: "video/mp4" },
      description: "Upload a prepared MP4 (H.264, web optimised / fast start, no audio). The complete clip plays before the next one starts; a single clip loops. Videos are not automatically compressed or converted. Aim for a short cut under 3 MB.",
      validation: (r) => [filmRequired('file')(r), filmSize(3, "landscape")(r)],
    }),
    defineField({
      name: "videoPortrait",
      title: "Film (portrait)",
      type: "file",
      hidden: ({parent}) => parent?.videoMode === "mux",
      options: { accept: "video/mp4" },
      description:
        "Optional. A prepared MP4 framed for a phone held upright (720×1280, H.264, under 1 MB). Without one, phones get the landscape cut. Export both cuts with the same duration. Videos are not automatically converted.",
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
