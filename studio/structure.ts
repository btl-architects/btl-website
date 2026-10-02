import type { StructureResolver } from "sanity/structure";
import { OrderPane } from "./components/OrderPane";

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
      S.listItem().title("Arrange projects").id("arrange-projects")
        .child(S.component().id("project-order").title("Arrange projects").component(OrderPane).options({type: "project"})),
      S.documentTypeListItem("person").title("People"),
      S.listItem().title("Arrange people").id("arrange-people")
        .child(S.component().id("person-order").title("Arrange people").component(OrderPane).options({type: "person"})),
      S.documentTypeListItem("publication").title("Press & awards"),
      S.documentTypeListItem("category").title("Categories"),
      S.documentTypeListItem("location").title("Locations"),
      S.documentTypeListItem("redirect").title("Redirects"),
      S.divider(),
      S.listItem()
        .title("Site settings")
        .id("settings")
        .child(S.document().schemaType("settings").documentId("settings")),
    ]);
