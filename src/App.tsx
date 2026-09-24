import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CloudInstance } from "./api-types";
import { ActivityFeed } from "./components/ActivityFeed";
import { DetailDrawer } from "./components/DetailDrawer";
import { FleetBar } from "./components/FleetBar";
import { Header } from "./components/Header";
import { AlertIcon } from "./components/Icons";
import { InstanceTable } from "./components/InstanceTable";
import { Stats } from "./components/Stats";
import { Toasts } from "./components/Toasts";
import { Toolbar } from "./components/Toolbar";
import { useActivity, useHotkeys, useInstances, useNow, useTheme } from "./hooks";
import {
  filterInstances,
  parseUrlState,
  serializeUrlState,
  sortInstances,
  summarize,
  type Filter,
  type SortDir,
  type SortKey,
} from "./lib";

const POLL_MS = 10_000;
const BASE_TITLE = "GCP Compute Inventory";

export default function App() {
  // Search, filter, sort and the open VM live in the URL, so any view is a shareable link.
  const initial = useMemo(() => parseUrlState(window.location.search), []);
  const [query, setQuery] = useState(initial.q);
  const [filter, setFilter] = useState<Filter>(initial.status);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: initial.sort, dir: initial.dir });
  const [selectedId, setSelectedId] = useState<string | null>(initial.vm);
  const [live, setLive] = useState(true);

  const { data, error, loading, refreshing, updatedAt, refresh } = useInstances(live ? POLL_MS : null);
  const { events, flashIds, toasts, dismissToast } = useActivity(data);
  const { theme, cycle: cycleTheme } = useTheme();
  const now = useNow(30_000);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastSelected = useRef<CloudInstance | null>(null);

  const instances = useMemo(() => data?.instances ?? [], [data]);
  const summary = useMemo(() => (data ? summarize(instances) : null), [data, instances]);
  const visible = useMemo(
    () => sortInstances(filterInstances(instances, filter, query), sort.key, sort.dir),
    [instances, filter, query, sort],
  );

  // The drawer follows the live list; if its VM disappears we keep the last known copy on screen.
  const selectedLive = useMemo(() => instances.find((i) => i.id === selectedId) ?? null, [instances, selectedId]);
  useEffect(() => {
    if (selectedLive) lastSelected.current = selectedLive;
  }, [selectedLive]);
  const selected = selectedLive ?? (lastSelected.current?.id === selectedId ? lastSelected.current : null);
  useEffect(() => {
    if (data && selectedId && !selected) setSelectedId(null); // deep link to an unknown VM
  }, [data, selectedId, selected]);

  useEffect(() => {
    const search = serializeUrlState({ q: query, status: filter, sort: sort.key, dir: sort.dir, vm: selectedId });
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }, [query, filter, sort, selectedId]);

  useEffect(() => {
    document.title = summary ? `${summary.running}/${summary.total} running · ${BASE_TITLE}` : BASE_TITLE;
  }, [summary]);

  useHotkeys({
    "/": () => searchRef.current?.focus(),
    r: () => void refresh(),
    l: () => setLive((value) => !value),
    t: cycleTheme,
  });

  const handleSort = useCallback(
    (key: SortKey) =>
      setSort((current) =>
        current.key === key
          ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
          : { key, dir: key === "createdAt" ? "desc" : "asc" },
      ),
    [],
  );
  const closeDrawer = useCallback(() => setSelectedId(null), []);

  return (
    <div className="page">
      <Header
        projectId={data?.projectId ?? null}
        live={live}
        onToggleLive={setLive}
        refreshing={refreshing}
        updatedAt={updatedAt}
        onRefresh={() => void refresh()}
        theme={theme}
        onCycleTheme={cycleTheme}
      />

      {error && (
        <div className="banner" role="alert">
          <AlertIcon width={20} height={20} />
          <div>
            <strong>{data ? "Couldn’t refresh the inventory" : "Couldn’t load the inventory"}</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      )}

      <Stats summary={summary} loading={loading} />
      {summary && <FleetBar summary={summary} />}
      <Toolbar
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
        summary={summary}
        inputRef={searchRef}
        sort={sort}
        onSortChange={(key, dir) => setSort({ key, dir })}
      />
      <InstanceTable
        instances={visible}
        totalCount={instances.length}
        loading={loading}
        loaded={data !== null}
        onSelect={(instance) => setSelectedId(instance.id)}
        sort={sort}
        onSort={handleSort}
        flashIds={flashIds}
      />

      <ActivityFeed events={events} now={now} onSelect={setSelectedId} />

      <footer className="footer muted small">
        Read-only view · data from Compute Engine via a <span className="mono">roles/compute.viewer</span> service account
        <br />
        Shortcuts: <kbd className="kbd">/</kbd> search · <kbd className="kbd">R</kbd> refresh · <kbd className="kbd">L</kbd> live ·{" "}
        <kbd className="kbd">T</kbd> theme
      </footer>

      {selected && data && (
        <DetailDrawer key={selected.id} summary={selected} projectId={data.projectId} events={events} onClose={closeDrawer} />
      )}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
