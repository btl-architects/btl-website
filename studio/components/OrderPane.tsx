import {useCallback, useEffect, useRef, useState} from "react";
import {Box, Button, Card, Flex, Heading, Spinner, Stack, Text} from "@sanity/ui";
import {useClient} from "sanity";
import {moveEntry, orderEntries, publishPositions, sameOrder, type OrderDocument, type OrderEntry, type OrderingClient} from "./ordering";

const groupLabels: Record<string, string> = {
  projects: "Projects", principal: "Principals", team: "Team", alumni: "Alumni", other: "Other people",
};
const query = `*[_type == $type && !(_id in path("versions.**"))]{
  _id, _rev, _type, title, name, order, tier, showInTeam, active, lifecycle
}`;

export function OrderPane({options}: {options?: Record<string, unknown>}) {
  const type = options?.type === "person" ? "person" : "project";
  const client = useClient({apiVersion: "2025-02-19"}).withConfig({perspective: "raw", useCdn: false});
  return <OrderBoard type={type} client={client} />;
}

export function OrderBoard({type, client}: {type: "project" | "person"; client: OrderingClient}) {
  const [entries, setEntries] = useState<OrderEntry[]>([]);
  const [saved, setSaved] = useState<OrderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const dragged = useRef<string | null>(null);
  const dirty = !sameOrder(entries, saved);
  // A stable client avoids reloading the pane whenever local order changes.
  const clientRef = useRef(client);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const docs = await clientRef.current.fetch<OrderDocument[]>(query, {type});
      const next = orderEntries(docs);
      setEntries(next); setSaved(next);
    } catch { setError("Could not load the list. Check your connection and try again."); }
    finally { setLoading(false); }
  }, [type]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function move(from: string, to: string, focus = false) {
    const next = moveEntry(entries, from, to);
    if (next === entries) return;
    setEntries(next);
    const entry = next.find((e) => e.id === from)!;
    const position = next.filter((e) => e.group === entry.group).findIndex((e) => e.id === from) + 1;
    setStatus(`${entry.title} moved to position ${position}. Order is not published yet.`);
    if (focus) requestAnimationFrame(() => handles.current.get(from)?.focus());
  }

  async function publishOrder() {
    setBusy(true); setError("");
    try {
      await publishPositions(clientRef.current, query, type, saved, entries);
      await load();
      setStatus("Order published. The website will show it after its next successful rebuild. New entries still need to be published separately.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(message.startsWith("The list changed") ? message
        : "Could not publish the order. No partial order was saved. Reload to check for another editor’s changes, then try again.");
    } finally { setBusy(false); }
  }

  return <Box padding={4} style={{height: "100%", overflowY: "auto"}}>
    <Stack gap={4}>
      <Heading size={2}>Arrange {type === "person" ? "people" : "projects"}</Heading>
      <Text size={2}>Drag the handles, or use Move up and Move down. First in the list means first on the website.</Text>
      <Text size={1} muted>Publish order changes positions only. Other unfinished edits stay unpublished. New entries remain drafts until you publish them in their own editor.</Text>
      <Flex gap={2} wrap="wrap">
        <Button text={busy ? "Publishing order…" : "Publish order"} tone="primary" disabled={!dirty || busy || loading} onClick={() => void publishOrder()} />
        <Button text="Discard changes" mode="ghost" disabled={!dirty || busy || loading} onClick={() => { setEntries(saved); setError(""); setStatus("Unpublished order changes discarded."); }} />
        <Button text="Reload list" mode="ghost" disabled={busy || loading || dirty && !error} onClick={() => void load()} />
      </Flex>
      <Text size={1} muted>{dirty ? "Order changed — publish it before leaving this view." : "No unpublished order changes."}</Text>
      {error && <Card padding={3} tone="critical" role="alert"><Text size={1}>{error}</Text></Card>}
      <div role="status" aria-live="polite"><Text size={1}>{status}</Text></div>
      {loading ? <Spinner /> : [...new Set(entries.map((e) => e.group))]
        .sort((a, b) => ["projects", "principal", "team", "alumni", "other"].indexOf(a) - ["projects", "principal", "team", "alumni", "other"].indexOf(b))
        .map((group) => {
          const rows = entries.filter((entry) => entry.group === group);
          return <Stack key={group} gap={3}>
            <Heading size={1}>{groupLabels[group] || "Other people"}</Heading>
            <ol style={{listStyle: "none", padding: 0, margin: 0}}>
              {rows.map((entry, index) => {
                const source = entry.published ?? entry.draft!;
                const visible = type === "person" ? source.active === true : source.lifecycle === "published";
                return <li key={entry.id} style={{marginBottom: 8}}
                  onDragOver={(event) => {
                    if (busy || entries.find((e) => e.id === dragged.current)?.group !== group) return;
                    event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(entry.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (!busy && dragged.current) move(dragged.current, entry.id);
                    dragged.current = null; setDropTarget(null);
                  }}>
                  <Card padding={3} radius={2} border tone={dropTarget === entry.id ? "primary" : "default"}>
                    <Flex gap={3} align="center" wrap="wrap">
                      <Button text="↕" mode="ghost" aria-label={`Arrange ${entry.title}`} disabled={busy}
                        ref={(element) => { if (element) handles.current.set(entry.id, element); else handles.current.delete(entry.id); }}
                        draggable={!busy} style={{cursor: busy ? "default" : "grab", minHeight: 44}}
                        onDragStart={(event) => { dragged.current = entry.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", entry.id); }}
                        onDragEnd={() => { dragged.current = null; setDropTarget(null); }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp" && index > 0) { event.preventDefault(); move(entry.id, rows[index - 1].id, true); }
                          if (event.key === "ArrowDown" && index < rows.length - 1) { event.preventDefault(); move(entry.id, rows[index + 1].id, true); }
                        }} />
                      <Text size={1} muted>{index + 1}</Text>
                      <Box flex={1} style={{minWidth: 120}}><Stack gap={2}>
                        <Text size={2} weight="semibold">{entry.title}</Text>
                        <Text size={1} muted>{!entry.published ? "New draft" : !visible ? "Not shown on the website" : "On the website"}{entry.published && entry.draft ? " · Unpublished edits" : ""}</Text>
                      </Stack></Box>
                      <Button text="Move up" mode="ghost" aria-label={`Move ${entry.title} up`} disabled={busy || index === 0} onClick={() => move(entry.id, rows[index - 1].id, true)} />
                      <Button text="Move down" mode="ghost" aria-label={`Move ${entry.title} down`} disabled={busy || index === rows.length - 1} onClick={() => move(entry.id, rows[index + 1].id, true)} />
                    </Flex>
                  </Card>
                </li>;
              })}
            </ol>
          </Stack>;
        })}
      {!loading && !entries.length && <Text size={2} muted>No entries yet. Add one in {type === "person" ? "People" : "Projects"} first.</Text>}
    </Stack>
  </Box>;
}
