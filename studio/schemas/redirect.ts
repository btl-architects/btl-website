import { defineField, defineType } from "sanity";

/* A redirect.
 *
 * These exist so a URL that has been shared, printed or indexed keeps working
 * after the page behind it moves. That makes them a permanent commitment, and
 * a badly formed one is worse than none: a loop takes a page off the internet,
 * and a redirect to a 404 turns a working link into a broken one with an extra
 * hop.
 *
 * So the build validates the whole set — loops, self-redirects, duplicate
 * sources, and targets that do not resolve all fail it. See
 * web/tools/redirects.mjs.
 */
export default defineType({
  name: "redirect",
  title: "Redirect",
  type: "document",
  fields: [
    defineField({
      name: "from",
      title: "Old address",
      type: "string",
      description: 'The path that should no longer be used — "/projects/old-name". Path only, no domain.',
      validation: (r) =>
        r.required().custom((v) =>
          !v || v.startsWith("/") ? true : "Start with a slash, and leave the domain off.",
        ),
    }),
    defineField({
      name: "to",
      title: "Send them to",
      type: "string",
      description: 'Where it should go instead — "/projects/new-name", or a full https:// address.',
      validation: (r) =>
        r.required().custom((v) =>
          !v || v.startsWith("/") || v.startsWith("https://")
            ? true
            : "Use a path beginning with / or a full https:// address.",
        ),
    }),
    defineField({
      name: "permanent",
      title: "Permanent",
      type: "boolean",
      description:
        "Leave this on unless the move is genuinely temporary. Permanent tells search engines to transfer the old page's standing to the new one.",
      initialValue: true,
    }),
    defineField({
      name: "note",
      title: "Why",
      type: "string",
      description: "For whoever reads this in two years.",
    }),
  ],
  preview: {
    select: { title: "from", subtitle: "to", permanent: "permanent" },
    prepare: ({ title, subtitle, permanent }) => ({
      title: `${title} → ${subtitle}`,
      subtitle: permanent === false ? "temporary (302)" : "permanent (301)",
    }),
  },
});
