import { describe, expect, it } from "vitest";
import type { CloudInstance } from "./api-types";
import {
  consoleUrl,
  describeEvent,
  DEFAULT_URL_STATE,
  diffInstances,
  filterInstances,
  parseUrlState,
  relativeTime,
  serializeUrlState,
  sortInstances,
  sshCommand,
  statusGroup,
  summarize,
} from "./lib";

function vm(overrides: Partial<CloudInstance> = {}): CloudInstance {
  return {
    provider: "gcp",
    id: "1",
    name: "web-1",
    status: "running",
    region: "europe-west1",
    zone: "europe-west1-b",
    machineType: "e2-micro",
    privateIp: "10.0.0.4",
    publicIp: "34.1.2.3",
    createdAt: null,
    labels: {},
    ...overrides,
  };
}

describe("statusGroup", () => {
  it.each([
    ["running", "running"],
    ["stopped", "stopped"],
    ["terminated", "stopped"],
    ["starting", "transition"],
    ["stopping", "transition"],
    ["unknown", "unknown"],
  ] as const)("%s -> %s", (status, group) => {
    expect(statusGroup(status)).toBe(group);
  });
});

describe("summarize", () => {
  it("counts every group and the total", () => {
    const result = summarize([
      vm({ status: "running" }),
      vm({ status: "running" }),
      vm({ status: "stopped" }),
      vm({ status: "stopping" }),
      vm({ status: "unknown" }),
    ]);
    expect(result).toEqual({ total: 5, running: 2, stopped: 1, transition: 1, unknown: 1 });
  });

  it("returns zeros for an empty list", () => {
    expect(summarize([])).toEqual({ total: 0, running: 0, stopped: 0, transition: 0, unknown: 0 });
  });
});

describe("filterInstances", () => {
  const list = [
    vm({ id: "1", name: "web-1", status: "running" }),
    vm({ id: "2", name: "db-1", status: "stopped", publicIp: null, labels: { env: "prod" } }),
    vm({ id: "3", name: "cache", status: "starting", zone: "us-central1-a" }),
  ];

  it("returns everything for the all filter and an empty query", () => {
    expect(filterInstances(list, "all", "")).toHaveLength(3);
  });

  it("filters by status group", () => {
    expect(filterInstances(list, "stopped", "").map((i) => i.id)).toEqual(["2"]);
    expect(filterInstances(list, "transition", "").map((i) => i.id)).toEqual(["3"]);
  });

  it("searches name, zone and labels case-insensitively", () => {
    expect(filterInstances(list, "all", "WEB").map((i) => i.id)).toEqual(["1"]);
    expect(filterInstances(list, "all", "us-central").map((i) => i.id)).toEqual(["3"]);
    expect(filterInstances(list, "all", "env:prod").map((i) => i.id)).toEqual(["2"]);
  });

  it("combines status filter and query, and tolerates null IPs", () => {
    expect(filterInstances(list, "running", "db")).toEqual([]);
    expect(filterInstances(list, "all", "34.1.2.3").map((i) => i.id)).toEqual(["1", "3"]);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-09-24T12:00:00Z");

  it("handles missing or invalid dates", () => {
    expect(relativeTime(null, now)).toBe("—");
    expect(relativeTime("not a date", now)).toBe("—");
  });

  it.each([
    ["2026-09-24T11:59:40Z", "just now"],
    ["2026-09-24T11:55:00Z", "5 min ago"],
    ["2026-09-24T09:00:00Z", "3 h ago"],
    ["2026-09-23T10:00:00Z", "1 day ago"],
    ["2026-09-20T12:00:00Z", "4 days ago"],
  ])("%s -> %s", (iso, expected) => {
    expect(relativeTime(iso, now)).toBe(expected);
  });
});

describe("sortInstances", () => {
  const list = [
    vm({ id: "1", name: "b-vm", status: "stopped", createdAt: "2026-09-01T00:00:00Z" }),
    vm({ id: "2", name: "a-vm", status: "running", createdAt: null }),
    vm({ id: "3", name: "c-vm", status: "starting", createdAt: "2026-09-02T00:00:00Z" }),
  ];

  it("sorts by name in both directions without mutating the input", () => {
    expect(sortInstances(list, "name", "asc").map((i) => i.name)).toEqual(["a-vm", "b-vm", "c-vm"]);
    expect(sortInstances(list, "name", "desc").map((i) => i.name)).toEqual(["c-vm", "b-vm", "a-vm"]);
    expect(list.map((i) => i.name)).toEqual(["b-vm", "a-vm", "c-vm"]);
  });

  it("ranks status running, changing, stopped", () => {
    expect(sortInstances(list, "status", "asc").map((i) => i.name)).toEqual(["a-vm", "c-vm", "b-vm"]);
  });

  it("keeps missing dates last regardless of direction", () => {
    expect(sortInstances(list, "createdAt", "asc").map((i) => i.name)).toEqual(["b-vm", "c-vm", "a-vm"]);
    expect(sortInstances(list, "createdAt", "desc").map((i) => i.name)).toEqual(["c-vm", "b-vm", "a-vm"]);
  });

  it("sorts numbers inside names naturally", () => {
    const named = [vm({ name: "vm-10" }), vm({ name: "vm-2" })];
    expect(sortInstances(named, "name", "asc").map((i) => i.name)).toEqual(["vm-2", "vm-10"]);
  });
});

describe("diffInstances", () => {
  const at = new Date("2026-09-24T12:00:00Z");
  const a = vm({ id: "1", name: "a", status: "running" });
  const b = vm({ id: "2", name: "b", status: "running" });

  it("returns nothing when nothing changed", () => {
    expect(diffInstances([a, b], [{ ...a }, { ...b }], at)).toEqual([]);
  });

  it("detects a status change", () => {
    const events = diffInstances([a, b], [{ ...a, status: "stopping" }, b], at);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "changed", name: "a", from: "running", to: "stopping" });
    expect(describeEvent(events[0])).toBe("running → stopping");
  });

  it("detects added and removed instances", () => {
    const events = diffInstances([a], [b], at);
    expect(events.map((e) => [e.kind, e.name])).toEqual([
      ["added", "b"],
      ["removed", "a"],
    ]);
  });
});

describe("URL state", () => {
  it("round-trips a full state", () => {
    const state = { q: "web 1", status: "running" as const, sort: "createdAt" as const, dir: "desc" as const, vm: "42" };
    expect(parseUrlState(serializeUrlState(state))).toEqual(state);
  });

  it("omits defaults so the default view has a clean URL", () => {
    expect(serializeUrlState(DEFAULT_URL_STATE)).toBe("");
  });

  it("ignores invalid values instead of trusting them", () => {
    expect(parseUrlState("?status=hacked&sort=drop&dir=sideways&q=x")).toEqual({ ...DEFAULT_URL_STATE, q: "x" });
  });
});

describe("GCP helpers", () => {
  it("builds a Cloud Console deep link and a ssh command", () => {
    expect(consoleUrl("my-proj", "europe-west1-b", "vm-1")).toBe(
      "https://console.cloud.google.com/compute/instancesDetail/zones/europe-west1-b/instances/vm-1?project=my-proj",
    );
    expect(sshCommand("my-proj", "europe-west1-b", "vm-1")).toBe(
      "gcloud compute ssh vm-1 --zone=europe-west1-b --project=my-proj",
    );
  });
});
