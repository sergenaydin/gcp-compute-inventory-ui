import type { CloudInstance, ListInstancesResult } from "./api-types";

// Empty by default: requests go to the same origin (the Vite dev/preview proxy).
// Set VITE_API_BASE_URL at build time to call an API hosted elsewhere.
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`);
  } catch {
    throw new Error("Could not reach the inventory service. Is it running?");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON body: fall through to the generic message below
  }

  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new Error(message ?? `Request failed with status ${res.status}.`);
  }
  return body as T;
}

export const fetchInstances = () => getJson<ListInstancesResult>("/api/instances");

export const fetchInstance = (id: string) =>
  getJson<CloudInstance>(`/api/instances/${encodeURIComponent(id)}`);
