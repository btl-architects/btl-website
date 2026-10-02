import {strict as assert} from "node:assert";
import {test} from "node:test";
import {moveEntry, orderEntries, publishPositions, type OrderDocument, type OrderingClient, type orderMutations} from "../components/ordering.ts";

function fixture() {
  return [
    {_id: "alpha", _rev: "a1", _type: "project", title: "Published Alpha", order: 10, lifecycle: "published"},
    {_id: "drafts.alpha", _rev: "ad1", _type: "project", title: "Unfinished title", order: 10, lifecycle: "hidden"},
    {_id: "beta", _rev: "b1", _type: "project", title: "Beta", order: 20, lifecycle: "published"},
    {_id: "drafts.new", _rev: "n1", _type: "project", title: "New project", order: 30, lifecycle: "draft"},
  ] satisfies OrderDocument[];
}

// Model the storage boundary: a single commit either applies every guarded
// position patch or rejects all of them. Extra fields stand in for client edits.
function storage(initial: OrderDocument[]) {
  let documents = structuredClone(initial);
  let commits = 0;
  let beforeCommit: (() => void) | undefined;
  const client: OrderingClient = {
    async fetch<T>() { return structuredClone(documents) as T; },
    async mutate(mutations: ReturnType<typeof orderMutations>, options) {
      assert.equal(options.visibility, "sync");
      beforeCommit?.();
      for (const {patch} of mutations) {
        assert.deepEqual(Object.keys(patch.set), ["order"]);
        assert.equal(documents.find((doc) => doc._id === patch.id)?._rev, patch.ifRevisionID, "revision conflict");
      }
      commits++;
      documents = documents.map((doc) => {
        const patch = mutations.find(({patch}) => patch.id === doc._id)?.patch;
        return patch ? {...doc, ...patch.set, _rev: `${doc._rev}-saved`} : doc;
      });
    },
  };
  return {client, read: () => documents, commits: () => commits,
    change: (id: string) => { documents = documents.map((doc) => doc._id === id ? {...doc, _rev: `${doc._rev}-edited`} : doc); },
    add: (doc: OrderDocument) => { documents.push(doc); },
    race: (callback: () => void) => { beforeCommit = callback; }};
}

test("publishing and reopening retains order without publishing other draft fields", async () => {
  const db = storage(fixture());
  const saved = orderEntries(db.read());
  const arranged = moveEntry(saved, "beta", "alpha");
  await publishPositions(db.client, "query", "project", saved, arranged);
  assert.equal(db.commits(), 1);
  assert.deepEqual(orderEntries(db.read()).map((entry) => entry.id), ["beta", "alpha", "new"]);
  assert.equal(db.read().find((doc) => doc._id === "alpha")?.title, "Published Alpha");
  assert.equal(db.read().find((doc) => doc._id === "drafts.alpha")?.title, "Unfinished title");
  assert.equal(db.read().find((doc) => doc._id === "drafts.alpha")?.order, 20);
  assert.equal(db.read().some((doc) => doc._id === "new"), false);
  // A later publication of Alpha's draft retains the position.
  const publishedLater = db.read().filter((doc) => doc._id !== "alpha" && doc._id !== "drafts.alpha");
  publishedLater.push({...db.read().find((doc) => doc._id === "drafts.alpha")!, _id: "alpha"});
  assert.deepEqual(orderEntries(publishedLater).map((entry) => entry.id), ["beta", "alpha", "new"]);
});

test("a changed record or newly created draft refuses stale order before any commit", async () => {
  for (const conflict of ["edit", "new draft"]) {
    const db = storage(fixture());
    const saved = orderEntries(db.read());
    if (conflict === "edit") db.change("beta");
    else db.add({_id: "drafts.beta", _rev: "bd1", _type: "project", title: "Unfinished Beta", order: 20});
    await assert.rejects(publishPositions(db.client, "query", "project", saved, moveEntry(saved, "beta", "alpha")), /The list changed/);
    assert.equal(db.commits(), 0);
    assert.equal(db.read().find((doc) => doc._id === "alpha")?.order, 10);
  }
});

test("an edit between refresh and commit rejects the complete batch", async () => {
  const db = storage(fixture());
  const saved = orderEntries(db.read());
  db.race(() => db.change("drafts.alpha"));
  await assert.rejects(publishPositions(db.client, "query", "project", saved, moveEntry(saved, "beta", "alpha")), /revision conflict/);
  assert.equal(db.commits(), 0);
  assert.equal(db.read().find((doc) => doc._id === "beta")?.order, 20);
});

test("people remain in their published sections, hidden people are preserved, and ties are stable", async () => {
  const people: OrderDocument[] = [
    {_id: "z", _rev: "z1", _type: "person", tier: "alumni", active: true},
    {_id: "a", _rev: "a1", _type: "person", tier: "team", active: true},
    {_id: "b", _rev: "b1", _type: "person", tier: "team", active: false},
    {_id: "drafts.a", _rev: "ad1", _type: "person", tier: "alumni", active: false},
    {_id: "versions.release.a", _rev: "v1", _type: "person", tier: "principal"},
  ];
  const db = storage(people.filter((doc) => !doc._id.startsWith("versions.")));
  const saved = orderEntries(people);
  assert.deepEqual(saved.map((entry) => entry.id), ["a", "b", "z"]);
  assert.equal(saved[0].group, "team");
  assert.equal(moveEntry(saved, "a", "z"), saved);
  await publishPositions(db.client, "query", "person", saved, moveEntry(saved, "b", "a"));
  assert.deepEqual(orderEntries(db.read()).filter((entry) => entry.group === "team").map((entry) => entry.id), ["b", "a"]);
  assert.equal(db.read().find((doc) => doc._id === "b")?.active, false);
  assert.equal(db.read().find((doc) => doc._id === "drafts.a")?.tier, "alumni");
});
