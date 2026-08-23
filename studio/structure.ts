import type { StructureResolver } from "sanity/structure";

/* The studio's own navigation.
 *
 * Settings is a single document, so it is pinned as one item rather than
 * appearing as a list with one row in it — an editor should never have to
 * create a second copy of the site's settings to find out that they shouldn't.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("btl architects")
    .items([
      S.documentTypeListItem("project").title("Projects"),
      S.documentTypeListItem("person").title("People"),
      S.documentTypeListItem("publication").title("Press & awards"),
      S.documentTypeListItem("category").title("Categories"),
      S.documentTypeListItem("location").title("Locations"),
      S.divider(),
      S.listItem()
        .title("Site settings")
        .id("settings")
        .child(S.document().schemaType("settings").documentId("settings")),
    ]);
