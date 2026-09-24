import { useCallback, useEffect, useRef, useState } from "react";
import type { CloudInstance, ListInstancesResult } from "./api-types";
import { fetchInstance, fetchInstances } from "./api";
import { diffInstances, type ActivityEvent } from "./lib";

export function useInstances(pollMs: number | null) {
  const [data, setData] = useState<ListInstancesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    setRefreshing(true);
    try {
      const result = await fetchInstances();
      if (mine !== latest.current) return;
      setData(result);
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      if (mine !== latest.current) return;
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      if (mine === latest.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const timer = setInterval(() => void load(), pollMs);
    return () => clearInterval(timer);
  }, [pollMs, load]);

  return { data, error, loading, refreshing, updatedAt, refresh: load };
}

export function useInstanceDetail(id: string | null, refreshKey = "") {
  const [detail, setDetail] = useState<CloudInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(null);
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    fetchInstance(id)
      .then((result) => !cancelled && setDetail(result))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Unexpected error."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  return { detail, error, loading };
}

const MAX_EVENTS = 30;
const FLASH_MS = 2600;
const TOAST_MS = 6000;

/** Compares each new snapshot with the previous one and reports what changed. */
export function useActivity(data: ListInstancesResult | null) {
  const previous = useRef<CloudInstance[] | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    if (!data) return;
    const before = previous.current;
    previous.current = data.instances;
    if (!before) return; // first load is a baseline, not a change

    const found = diffInstances(before, data.instances);
    if (found.length === 0) return;

    setEvents((current) => [...found, ...current].slice(0, MAX_EVENTS));
    setToasts((current) => [...found, ...current].slice(0, 3));

    const ids = found.map((event) => event.instanceId);
    setFlashIds((current) => new Set([...current, ...ids]));
    setTimeout(() => {
      setFlashIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, FLASH_MS);

    const toastIds = new Set(found.map((event) => event.id));
    setTimeout(() => setToasts((current) => current.filter((toast) => !toastIds.has(toast.id))), TOAST_MS);
  }, [data]);

  const dismissToast = useCallback(
    (id: string) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  );

  return { events, flashIds, toasts, dismissToast };
}

/** A clock that re-renders its consumer every `ms` (keeps "3 min ago" honest). */
export function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

export type Theme = "system" | "light" | "dark";
const THEME_KEY = "gcp-inventory-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === "light" || saved === "dark" ? saved : "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      if (theme === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      // storage can be unavailable (private mode); the theme still applies for this session
    }
  }, [theme]);

  const cycle = useCallback(
    () => setTheme((current) => (current === "system" ? "light" : current === "light" ? "dark" : "system")),
    [],
  );
  return { theme, cycle };
}

/** Single-key shortcuts; ignored while typing or when a modifier is held. */
export function useHotkeys(keys: Record<string, () => void>) {
  const latest = useRef(keys);
  latest.current = keys;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const action = latest.current[event.key.toLowerCase()];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
