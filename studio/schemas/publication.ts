import { defineField, defineType } from "sanity";
import {isSafeSlug} from '../../shared/slug.ts';

/* Press and awards are ONE type with a `kind`, never two systems.
 *
 * A separate "award" type would duplicate every field and then drift — a page
 * that has to merge two feeds to show one wall is a page that will eventually
 * show them inconsistently.
 */
export default defineType({
  name: "publication",
  title: "Press & awards",
  type: "document",
  fields: [
    defineField({name: 'seo', title: 'Search listing', type: 'seo',
      description: 'Optional metadata for this feature’s page. Does not change the headline, article or how it opens. Feature previews and embeds remain excluded from search.'}),
    defineField({
      name: "kind",
      type: "string",
      options: {
        list: [
          { title: "Press feature", value: "press" },
          { title: "Award", value: "award" },
        ],
        layout: "radio",
      },
      initialValue: "press",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "publication",
      title: "Publication or awarding body",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({ name: "short", title: "Short name", type: "string", description: "“AD”." }),
    defineField({
      name: "image", title: "Complete Press artwork", type: "figure",
      description: "Upload the complete PNG with photograph and publication name together. The entire artwork stays visible. In the image editor, place the hotspot at the centre of the photograph inside the artwork: this aligns the caption beneath the photograph on Home and Press. Transparent areas retain the dark background.",
    }),
    defineField({
      name: "useProjectImage", title: "Use the project photograph if there is no Press image",
      type: "boolean", initialValue: false,
      description: "Optional fallback. Turn off for a text-only entry until its own image is ready. A Press image always takes priority.",
    }),
    defineField({ name: "title", title: "Headline", type: "string", validation: (r) => r.required() }),
    defineField({name:'slug', title:'Web address', type:'slug',
      description:'Generate a readable address for this feature. Later address changes automatically keep the previous link working.',
      options:{source:doc => [doc.publication,doc.title].filter(Boolean).join(' '),maxLength:96,
        isUnique:async (slug,ctx) => {
          const id=ctx.document?._id.replace(/^drafts\./,'');
          return !await ctx.getClient({apiVersion:'2026-09-01'}).fetch<boolean>(
            'count(*[_type=="publication" && !(_id in [$id,"drafts."+$id]) && (slug.current==$slug || $slug in previousSlugs || _id==$slug)]) > 0',{id,slug});
        }},validation:r=>r.required().custom(value=>isSafeSlug(value?.current) || 'Use lowercase letters, numbers and single hyphens.')
    }),
    defineField({name:'previousSlugs',title:'Previous addresses',type:'array',of:[{type:'string'}],readOnly:true,
      description:'Recorded automatically when a published feature address changes.'}),
    defineField({ name: "date", type: "date", options: { dateFormat: "D MMMM YYYY" } }),
    defineField({
      name: "openingMode", title: "How the article opens", type: "string",
      initialValue: "external",
      options: {layout: "radio", list: [
        {title: "BTL reader — text and images added here", value: "reader"},
        {title: "Embedded publisher page — where the publisher allows it", value: "embed"},
        {title: "Feature preview — link to the original article", value: "external"},
      ]},
      description: "All three choices open the same BTL reading panel. Choose BTL reader for article text and images, embed where the publisher allows it, or a feature preview with a link to read the original in a new tab. Embedded pages keep the publisher's own appearance and may be blocked.",
    }),
    defineField({
      name: "intro", title: "Article introduction", type: "text", rows: 3,
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "A short standfirst below the headline. Leave a blank line between paragraphs; use Enter for a line break. Use your own project notes unless you have the publication's article text to republish.",
      validation: r => r.max(450),
    }),
    defineField({
      name: "articleHero", title: "Article opening photograph", type: "figure",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Separate from the PNG artwork used on the Press card. If empty, the article uses its related project's cover, then its Press artwork.",
    }),
    defineField({
      name: "articleCredits", title: "Article credits", type: "credits",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Design, photography and collaborators for this article. Only add verified credits.",
    }),
    defineField({
      name: "sourceAuthor", title: "Original article writer", type: "string",
      description: "Verified writer credited by the original publication. Displayed separately from the author of BTL's reader content, in all three opening modes.",
    }),
    defineField({
      name: "readerKind", title: "Reader content", type: "string",
      initialValue: "summary",
      hidden: ({document}) => document?.openingMode !== "reader",
      options: {list: [
        {title: "BTL project notes", value: "notes"},
        {title: "Summary of the original article", value: "summary"},
        {title: "Article supplied for republication", value: "article"},
      ], layout: "radio"},
      description: "Keep summaries brief and in your own words. Notes and summaries are labelled in the reader. Use the article option only when the studio has permission to republish the text. The original writer's credit stays separate.",
    }),
    defineField({
      name: "byline", title: "Article byline", type: "string",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Author of the content shown in this reader. For a summary, credit its author here and the publication's writer in Original article writer.",
    }),
    defineField({
      name: "readerPublishedAt", title: "BTL reader publication date", type: "date",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Optional date these notes were published on BTL. Separate from the publication's feature date above; used for search metadata.",
    }),
    defineField({
      name: "readerContent", title: "Article content", type: "articleContent",
      hidden: ({document}) => document?.openingMode !== "reader",
      description: "Add the article text, photographs or scanned magazine pages in reading order. Images display their full frame. Switching modes keeps this content saved.",
      validation: r => r.custom((value, context) => {
        if (context.document?.openingMode !== "reader") return true;
        const blocks = (value ?? []) as {_type?: string; children?: {text?: string}[]; asset?: {asset?: {_ref?: string}}}[];
        return blocks.some(b => b._type === "figure" ? Boolean(b.asset?.asset?._ref) :
          b._type === "block" && b.children?.some(s => s.text?.trim())) ||
          "Add article text or at least one magazine page for the BTL reader.";
      }),
    }),
    defineField({
      name: "url",
      type: "url",
      description: "The original publication address. Required for an external link or embedded page; optional for the BTL reader. Embedded pages need HTTPS and the publisher's permission to embed. Architectural Digest currently blocks embedding.",
      validation: (r) => [r.uri({ scheme: ["http", "https"] }), r.custom((value, context) => {
        if (value) {
          try {const url = new URL(value); if (url.username || url.password) return "Use a public article address without login credentials.";}
          catch {return "Enter a complete web address.";}
        }
        const mode = context.document?.openingMode;
        if (mode === "reader") return true;
        // Older records may intentionally have no link (for example an award).
        if (!value && (!mode || context.document?.kind === "award" && mode === "external")) return true;
        if (!value) return "Add the original article address.";
        if (mode === "embed" && !String(value).startsWith("https://")) return "Embedded articles need an HTTPS address.";
        return true;
      })],
    }),
    defineField({
      name: "relatedProject",
      title: "The work that earned it",
      type: "reference",
      to: [{ type: "project" }],
      description:
        "Names the project this feature or award is about. It does not replace the Press image.",
    }),
  ],
  orderings: [{ name: "date", title: "Newest", by: [{ field: "date", direction: "desc" }] }],
  preview: {
    select: { title: "publication", subtitle: "title", media: "image.asset", kind: "kind" },
    prepare: ({ title, subtitle, media, kind }) => ({
      title: `${title || "Untitled entry"}${kind === "award" ? " · award" : ""}`,
      subtitle,
      media,
    }),
  },
});
