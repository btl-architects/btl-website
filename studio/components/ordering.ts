export interface OrderDocument {
  _id: string;
  _rev: string;
  _type: "project" | "person";
  title?: string;
  name?: string;
  order?: number;
  tier?: string;
  showInTeam?: boolean;
  active?: boolean;
  lifecycle?: string;
}

export interface OrderEntry {
  id: string;
  title: string;
  group: string;
  position: number;
  published?: OrderDocument;
  draft?: OrderDocument;
}

export function orderEntries(documents: OrderDocument[]): OrderEntry[] {
  const entries = new Map<string, { published?: OrderDocument; draft?: OrderDocument }>();
  for (const doc of documents) {
    if (doc._id.startsWith("versions.")) continue;
    const id = doc._id.replace(/^drafts\./, "");
    const entry = entries.get(id) ?? {};
    entry[doc._id.startsWith("drafts.") ? "draft" : "published"] = doc;
    entries.set(id, entry);
  }
  return [...entries].map(([id, entry]) => {
    // Arrange the published sections. A draft changing someone's tier must
    // not silently change where their published record is ordered.
    const source = entry.published ?? entry.draft!;
    const group = source._type === "project" ? "projects" : source.tier==='principal' && source.showInTeam!==false ? 'team' : source.tier ?? "other";
    const label = entry.draft ?? source;
    return { ...entry, id, group, title: label.name || label.title || "Untitled entry",
      position: Number.isFinite(source.order) ? source.order! : 0 };
  }).sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Move within a section only. No document content or membership is changed. */
export function moveEntry(entries: OrderEntry[], from: string, to: string): OrderEntry[] {
  const a = entries.find((entry) => entry.id === from);
  const b = entries.find((entry) => entry.id === to);
  if (!a || !b || a.group !== b.group || from === to) return entries;
  const result = [...entries];
  result.splice(result.indexOf(a), 1);
  result.splice(result.indexOf(b) + (entries.indexOf(a) < entries.indexOf(b) ? 1 : 0), 0, a);
  return result;
}

/** A position-only transaction. Never publish a draft's other fields.
 * Patch existing drafts too so their later publication retains the new order.
 * Each revision guard makes the entire batch fail if an editor has changed a
 * touched record since it was loaded. The client sends these in ONE commit. */
export function orderMutations(entries: OrderEntry[]) {
  const positions = new Map<string, number>();
  return entries.flatMap((entry) => {
    const order = (positions.get(entry.group) ?? 0) + 10;
    positions.set(entry.group, order);
    return [entry.published, entry.draft].flatMap((doc) =>
      doc && doc.order !== order
        ? [{ patch: { id: doc._id, ifRevisionID: doc._rev, set: { order } } }]
        : []);
  });
}

export function sameOrder(a: OrderEntry[], b: OrderEntry[]) {
  return a.length === b.length && a.every((entry, i) => entry.id === b[i]?.id);
}

export interface OrderingClient {
  fetch<T>(query: string, params: {type: string}): Promise<T>;
  mutate(mutations: ReturnType<typeof orderMutations>, options: {visibility: "sync"}): Promise<unknown>;
}

export async function publishPositions(client: OrderingClient, query: string, type: string, saved: OrderEntry[], entries: OrderEntry[]) {
  // Refuse stale lists, including new drafts and changes to section membership.
  const current = await client.fetch<OrderDocument[]>(query, {type});
  const original = saved.flatMap((entry) => [entry.published, entry.draft]).filter(Boolean) as OrderDocument[];
  const revisions = new Map(original.map((doc) => [doc._id, doc._rev]));
  if (current.length !== revisions.size || current.some((doc) => revisions.get(doc._id) !== doc._rev)) {
    throw new Error("The list changed while you were arranging it. Your order has not been published. Reload the list and arrange it again.");
  }
  const mutations = orderMutations(entries);
  if (mutations.length) await client.mutate(mutations, {visibility: "sync"});
}
