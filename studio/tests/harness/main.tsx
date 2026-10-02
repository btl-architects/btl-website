// Local UI fixture only. This is not a Studio route and never connects to Sanity.
import {createRoot} from "react-dom/client";
import {ThemeProvider, studioTheme} from "@sanity/ui";
import "@sanity/ui/styles.css";
import {OrderBoard} from "../../components/OrderPane";
import type {OrderDocument, OrderingClient} from "../../components/ordering";

const initial: OrderDocument[] = [
  {_id: "a", _rev: "a1", _type: "project", title: "Courtyard House", order: 10, lifecycle: "published"},
  {_id: "drafts.a", _rev: "ad1", _type: "project", title: "Courtyard House — draft title", order: 10, lifecycle: "hidden"},
  {_id: "b", _rev: "b1", _type: "project", title: "Garden House", order: 20, lifecycle: "published"},
  {_id: "drafts.c", _rev: "c1", _type: "project", title: "New studio", order: 30, lifecycle: "draft"},
];
let documents: OrderDocument[] = JSON.parse(sessionStorage.getItem("order-fixture") || "null") ?? initial;
const client: OrderingClient = {
  async fetch<T>() {return structuredClone(documents) as T;},
  async mutate(mutations) {
    if (mutations.some(({patch}) => documents.find((doc) => doc._id === patch.id)?._rev !== patch.ifRevisionID)) throw new Error("Conflict");
    documents = documents.map((doc) => {
      const patch = mutations.find(({patch}) => patch.id === doc._id)?.patch;
      return patch ? {...doc, ...patch.set, _rev: `${doc._rev}-saved`} : doc;
    });
    sessionStorage.setItem("order-fixture", JSON.stringify(documents));
  },
};
createRoot(document.getElementById("root")!).render(<ThemeProvider theme={studioTheme}>
  <p style={{margin: 16}}>Local test records — no live content is changed.</p>
  <OrderBoard type="project" client={client} />
</ThemeProvider>);
