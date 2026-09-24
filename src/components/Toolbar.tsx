import type { RefObject } from "react";
import type { Filter, SortDir, SortKey, Summary } from "../lib";
import { SearchIcon } from "./Icons";

const FILTERS: { value: Filter; label: string; count: (s: Summary) => number }[] = [
  { value: "all", label: "All", count: (s) => s.total },
  { value: "running", label: "Running", count: (s) => s.running },
  { value: "stopped", label: "Stopped", count: (s) => s.stopped },
  { value: "transition", label: "Changing", count: (s) => s.transition },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name:asc", label: "Name (A–Z)" },
  { value: "name:desc", label: "Name (Z–A)" },
  { value: "status:asc", label: "Status" },
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "zone:asc", label: "Zone" },
  { value: "machineType:asc", label: "Machine type" },
];

interface Props {
  query: string;
  onQuery: (value: string) => void;
  filter: Filter;
  onFilter: (value: Filter) => void;
  summary: Summary | null;
  inputRef: RefObject<HTMLInputElement | null>;
  sort: { key: SortKey; dir: SortDir };
  onSortChange: (key: SortKey, dir: SortDir) => void;
}

export function Toolbar({ query, onQuery, filter, onFilter, summary, inputRef, sort, onSortChange }: Props) {
  return (
    <div className="toolbar">
      <label className="search">
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search name, zone, type, IP or label…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onQuery("");
              e.currentTarget.blur();
            }
          }}
          aria-label="Search instances"
          aria-keyshortcuts="/"
        />
        {!query && <kbd className="kbd">/</kbd>}
      </label>

      <label className="sort-select">
        <span className="sr-only">Sort by</span>
        <select
          value={`${sort.key}:${sort.dir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(":") as [SortKey, SortDir];
            onSortChange(key, dir);
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="segmented" role="group" aria-label="Filter by status">
        {FILTERS.map(({ value, label, count }) => (
          <button
            key={value}
            type="button"
            className={`segment${filter === value ? " is-active" : ""}`}
            aria-pressed={filter === value}
            onClick={() => onFilter(value)}
          >
            {label}
            {summary && <span className="segment-count">{count(summary)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
