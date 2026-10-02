import {defineType} from "sanity";

/** One reading format for every Press article; layout stays in the website. */
export default defineType({
  name: "articleContent", title: "Article content", type: "array",
  of: [
    {type: "block", styles: [
      {title: "Paragraph", value: "normal"}, {title: "Heading", value: "h2"},
      {title: "Small heading", value: "h3"}, {title: "Quote", value: "blockquote"},
    ], lists: [{title: "Bullet list", value: "bullet"}, {title: "Numbered list", value: "number"}],
    marks: {decorators: [{title: "Bold", value: "strong"}, {title: "Italic", value: "em"}],
      annotations: [{name: "link", type: "object", title: "Link", fields: [
        {name: "href", type: "url", title: "Web address", validation: r => [r.required().uri({scheme: ["https", "http"]}), r.custom(value => {
          if (!value) return true;
          if (typeof value !== "string") return "Enter a complete web address.";
          try {const url = new URL(value); return !url.username && !url.password || "Remove login credentials from this link.";}
          catch {return "Enter a complete web address.";}
        })]},
      ]}]},
    },
    {type: "figure", title: "Photograph or magazine page"},
    {name: "pullQuote", type: "object", title: "Pull quote", fields: [
      {name: "text", type: "text", rows: 3, validation: r => r.required().max(500)},
      {name: "attribution", type: "string", description: "Only name a speaker when these are their verified words."},
    ], preview: {select: {title: "text", subtitle: "attribution"}}},
  ],
});
