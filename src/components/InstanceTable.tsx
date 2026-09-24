import type { CloudInstance } from "../api-types";
import { relativeTime, type SortDir, type SortKey } from "../lib";
import { CopyButton } from "./CopyButton";
import { ArrowUpIcon, ChevronIcon, ServerIcon } from "./Icons";
import { StatusPill } from "./StatusPill";

interface Props {
  instances: CloudInstance[];
  totalCount: number;
  loading: boolean;
  loaded: boolean;
  onSelect: (instance: CloudInstance) => void;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  flashIds: Set<string>;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: Props["sort"];
  onSort: Props["onSort"];
  className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className={`th-btn${active ? " is-active" : ""}`} onClick={() => onSort(sortKey)}>
        {label}
        <ArrowUpIcon width={12} height={12} className={`sort-arrow${active && sort.dir === "desc" ? " is-desc" : ""}`} />
      </button>
    </th>
  );
}

function IpCell({ value, label }: { value: string | null; label: string }) {
  if (!value) return <span className="muted">—</span>;
  return (
    <span className="ip">
      <span className="mono">{value}</span>
      <CopyButton value={value} label={label} />
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <tr key={i} className="row-skeleton" aria-hidden="true">
          {Array.from({ length: 7 }, (_, j) => (
            <td key={j}>
              <span className="skeleton" style={{ width: j === 0 ? "70%" : "55%" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function InstanceTable({ instances, totalCount, loading, loaded, onSelect, sort, onSort, flashIds }: Props) {
  const empty = loaded && totalCount === 0;
  const noMatches = loaded && totalCount > 0 && instances.length === 0;

  return (
    <div className="card table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <SortHeader label="Name" sortKey="name" sort={sort} onSort={onSort} />
              <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
              <SortHeader label="Location" sortKey="zone" sort={sort} onSort={onSort} />
              <SortHeader label="Machine type" sortKey="machineType" sort={sort} onSort={onSort} className="col-type" />
              <th className="col-private">Private IP</th>
              <th>Public IP</th>
              <SortHeader label="Created" sortKey="createdAt" sort={sort} onSort={onSort} className="col-created" />
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {loading && <SkeletonRows />}
            {instances.map((instance) => (
              <tr
                key={`${instance.zone}/${instance.id}`}
                className={`row${flashIds.has(instance.id) ? " row-flash" : ""}`}
                tabIndex={0}
                onClick={() => onSelect(instance)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(instance);
                  }
                }}
              >
                <td className="name-cell">
                  <div className="name">{instance.name}</div>
                  <div className="muted mono small">{instance.id}</div>
                </td>
                <td>
                  <StatusPill status={instance.status} />
                </td>
                <td>
                  <div>{instance.zone}</div>
                  <div className="muted small">{instance.region}</div>
                </td>
                <td className="col-type">
                  <span className="tag mono">{instance.machineType}</span>
                </td>
                <td className="col-private">
                  <IpCell value={instance.privateIp} label="private IP" />
                </td>
                <td>
                  <IpCell value={instance.publicIp} label="public IP" />
                </td>
                <td className="col-created muted" title={instance.createdAt ?? undefined}>
                  {relativeTime(instance.createdAt)}
                </td>
                <td className="chevron">
                  <ChevronIcon />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {empty && (
        <div className="empty">
          <div className="empty-icon">
            <ServerIcon width={26} height={26} />
          </div>
          <h2>No VM instances found</h2>
          <p className="muted">This project has no Compute Engine instances yet.</p>
        </div>
      )}

      {noMatches && (
        <div className="empty">
          <h2>Nothing matches your filters</h2>
          <p className="muted">Try a different search term or status filter.</p>
        </div>
      )}
    </div>
  );
}
