import type { CloudInstance, InstanceStatus } from "./api-types";

export type StatusGroup = "running" | "stopped" | "transition" | "unknown";
export type Filter = "all" | StatusGroup;

export function statusGroup(status: InstanceStatus): StatusGroup {
  switch (status) {
    case "running":
      return "running";
    case "stopped":
    case "terminated":
      return "stopped";
    case "starting":
    case "stopping":
      return "transition";
    default:
      return "unknown";
  }
}

export interface Summary {
  total: number;
  running: number;
  stopped: number;
  transition: number;
  unknown: number;
}

export function summarize(instances: CloudInstance[]): Summary {
  const summary: Summary = { total: instances.length, running: 0, stopped: 0, transition: 0, unknown: 0 };
  for (const instance of instances) summary[statusGroup(instance.status)] += 1;
  return summary;
}

export function filterInstances(instances: CloudInstance[], filter: Filter, query: string): CloudInstance[] {
  const needle = query.trim().toLowerCase();
  return instances.filter((instance) => {
    if (filter !== "all" && statusGroup(instance.status) !== filter) return false;
    if (!needle) return true;
    const haystack = [
      instance.name,
      instance.id,
      instance.zone,
      instance.region,
      instance.machineType,
      instance.privateIp,
      instance.publicIp,
      ...Object.entries(instance.labels).map(([k, v]) => `${k}:${v}`),
    ];
    return haystack.some((value) => value?.toLowerCase().includes(needle));
  });
}

export function relativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/* ---------- sorting ---------- */

export type SortKey = "name" | "status" | "zone" | "machineType" | "createdAt";
export type SortDir = "asc" | "desc";

const STATUS_RANK: Record<StatusGroup, number> = { running: 0, transition: 1, stopped: 2, unknown: 3 };

export function sortInstances(list: CloudInstance[], key: SortKey, dir: SortDir): CloudInstance[] {
  const sign = dir === "asc" ? 1 : -1;
  const value = (i: CloudInstance): string | number | null => {
    if (key === "status") return STATUS_RANK[statusGroup(i.status)];
    if (key === "createdAt") return i.createdAt ? Date.parse(i.createdAt) : null;
    return i[key];
  };

  return [...list].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === null && bv === null) return a.name.localeCompare(b.name);
    if (av === null) return 1; // missing values always sort last
    if (bv === null) return -1;
    const order =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true });
    return order !== 0 ? order * sign : a.name.localeCompare(b.name);
  });
}

/* ---------- change detection ---------- */

export interface ActivityEvent {
  id: string;
  at: Date;
  kind: "changed" | "added" | "removed";
  instanceId: string;
  name: string;
  from?: InstanceStatus;
  to?: InstanceStatus;
}

export function diffInstances(prev: CloudInstance[], next: CloudInstance[], at: Date = new Date()): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const before = new Map(prev.map((i) => [i.id, i]));
  const stamp = at.getTime();

  for (const instance of next) {
    const old = before.get(instance.id);
    const base = { at, instanceId: instance.id, name: instance.name };
    if (!old) {
      events.push({ ...base, id: `${stamp}-${instance.id}-added`, kind: "added", to: instance.status });
    } else if (old.status !== instance.status) {
      events.push({ ...base, id: `${stamp}-${instance.id}-changed`, kind: "changed", from: old.status, to: instance.status });
    }
  }

  const present = new Set(next.map((i) => i.id));
  for (const old of prev) {
    if (!present.has(old.id)) {
      events.push({
        at,
        id: `${stamp}-${old.id}-removed`,
        kind: "removed",
        instanceId: old.id,
        name: old.name,
        from: old.status,
      });
    }
  }
  return events;
}

export function describeEvent(event: ActivityEvent): string {
  if (event.kind === "changed") return `${event.from} → ${event.to}`;
  if (event.kind === "added") return `appeared (${event.to})`;
  return "was removed";
}

/* ---------- shareable URL state ---------- */

export interface UrlState {
  q: string;
  status: Filter;
  sort: SortKey;
  dir: SortDir;
  vm: string | null;
}

export const DEFAULT_URL_STATE: UrlState = { q: "", status: "all", sort: "name", dir: "asc", vm: null };

const FILTERS: Filter[] = ["all", "running", "stopped", "transition", "unknown"];
const SORT_KEYS: SortKey[] = ["name", "status", "zone", "machineType", "createdAt"];

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const status = params.get("status") as Filter | null;
  const sort = params.get("sort") as SortKey | null;
  const dir = params.get("dir");
  return {
    q: params.get("q") ?? DEFAULT_URL_STATE.q,
    status: status && FILTERS.includes(status) ? status : DEFAULT_URL_STATE.status,
    sort: sort && SORT_KEYS.includes(sort) ? sort : DEFAULT_URL_STATE.sort,
    dir: dir === "desc" ? "desc" : "asc",
    vm: params.get("vm") || null,
  };
}

export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.status !== DEFAULT_URL_STATE.status) params.set("status", state.status);
  if (state.sort !== DEFAULT_URL_STATE.sort) params.set("sort", state.sort);
  if (state.dir !== DEFAULT_URL_STATE.dir) params.set("dir", state.dir);
  if (state.vm) params.set("vm", state.vm);
  const text = params.toString();
  return text ? `?${text}` : "";
}

/* ---------- GCP helpers (read-only: links and copy-paste commands) ---------- */

export function consoleUrl(projectId: string, zone: string, name: string): string {
  return (
    `https://console.cloud.google.com/compute/instancesDetail/zones/${encodeURIComponent(zone)}` +
    `/instances/${encodeURIComponent(name)}?project=${encodeURIComponent(projectId)}`
  );
}

export const sshCommand = (projectId: string, zone: string, name: string) =>
  `gcloud compute ssh ${name} --zone=${zone} --project=${projectId}`;

export const describeCommand = (projectId: string, zone: string, name: string) =>
  `gcloud compute instances describe ${name} --zone=${zone} --project=${projectId}`;
