import { useEffect, type ReactNode } from "react";
import type { CloudInstance } from "../api-types";
import { useInstanceDetail } from "../hooks";
import { consoleUrl, describeCommand, describeEvent, relativeTime, sshCommand, type ActivityEvent } from "../lib";
import { CopyButton } from "./CopyButton";
import { CloseIcon, ExternalIcon } from "./Icons";
import { StatusPill } from "./StatusPill";

interface Props {
  summary: CloudInstance;
  projectId: string;
  events: ActivityEvent[];
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Mono({ value }: { value: string | null }) {
  if (!value) return <span className="muted">—</span>;
  return (
    <span className="ip">
      <span className="mono">{value}</span>
      <CopyButton value={value} label={value} />
    </span>
  );
}

function Command({ label, value }: { label: string; value: string }) {
  return (
    <div className="cmd">
      <span className="cmd-label muted small">{label}</span>
      <div className="cmd-row">
        <code className="mono">{value}</code>
        <CopyButton value={value} label={label.toLowerCase()} />
      </div>
    </div>
  );
}

export function DetailDrawer({ summary, projectId, events, onClose }: Props) {
  // Refetch when the live status or IP changes so the panel never shows stale details.
  const { detail, error, loading } = useInstanceDetail(summary.id, `${summary.status}|${summary.publicIp ?? ""}`);
  const instance = detail ? { ...detail, status: summary.status } : summary;
  const labels = Object.entries(instance.labels);
  const history = events.filter((event) => event.instanceId === instance.id).slice(0, 5);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="drawer-root">
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Details for ${instance.name}`}>
        <div className="drawer-head">
          <div>
            <h2>{instance.name}</h2>
            <StatusPill status={instance.status} />
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details" autoFocus>
            <CloseIcon />
          </button>
        </div>

        <a
          className="btn drawer-link"
          href={consoleUrl(projectId, instance.zone, instance.name)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Cloud Console
          <ExternalIcon width={14} height={14} />
        </a>

        <dl className="fields">
          <Field label="Instance ID">
            <Mono value={instance.id} />
          </Field>
          <Field label="Provider">{instance.provider.toUpperCase()}</Field>
          <Field label="Zone">{instance.zone}</Field>
          <Field label="Region">{instance.region}</Field>
          <Field label="Machine type">
            <span className="tag mono">{instance.machineType}</span>
          </Field>
          <Field label="Private IP">
            <Mono value={instance.privateIp} />
          </Field>
          <Field label="Public IP">
            <Mono value={instance.publicIp} />
          </Field>
          <Field label="Created">
            {instance.createdAt ? (
              <>
                {new Date(instance.createdAt).toLocaleString()}{" "}
                <span className="muted">({relativeTime(instance.createdAt)})</span>
              </>
            ) : (
              <span className="muted">—</span>
            )}
          </Field>
        </dl>

        <h3>Labels</h3>
        {labels.length === 0 ? (
          <p className="muted">No labels on this instance.</p>
        ) : (
          <div className="labels">
            {labels.map(([key, value]) => (
              <span key={key} className="tag mono">
                {key}: {value}
              </span>
            ))}
          </div>
        )}

        <h3>Connect</h3>
        <Command label="SSH" value={sshCommand(projectId, instance.zone, instance.name)} />
        <Command label="Describe" value={describeCommand(projectId, instance.zone, instance.name)} />

        <h3>This session</h3>
        {history.length === 0 ? (
          <p className="muted small">No state changes seen since this page was opened.</p>
        ) : (
          <ul className="history">
            {history.map((event) => (
              <li key={event.id}>
                <span className="mono small muted">{event.at.toLocaleTimeString()}</span>
                <span>{describeEvent(event)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="drawer-foot muted small" aria-live="polite">
          {loading && "Loading live details…"}
          {error && <span className="error-text">{error}</span>}
          {!loading && !error && (
            <>
              Fetched from <span className="mono">GET /api/instances/{instance.id}</span>
            </>
          )}
        </p>
      </aside>
    </div>
  );
}
