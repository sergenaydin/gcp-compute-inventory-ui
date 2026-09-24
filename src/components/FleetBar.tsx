import type { Summary } from "../lib";

const SEGMENTS = [
  { key: "running", label: "Running" },
  { key: "transition", label: "Changing" },
  { key: "stopped", label: "Stopped" },
  { key: "unknown", label: "Unknown" },
] as const;

export function FleetBar({ summary }: { summary: Summary }) {
  if (summary.total === 0) return null;
  const parts = SEGMENTS.filter(({ key }) => summary[key] > 0);
  const percent = Math.round((summary.running / summary.total) * 100);
  const description = parts.map(({ key, label }) => `${summary[key]} ${label.toLowerCase()}`).join(", ");

  return (
    <section className="card fleet" aria-label="Fleet status">
      <div className="fleet-head">
        <h2>Fleet status</h2>
        <span className="muted small">{percent}% running</span>
      </div>

      <div className="fleet-bar" role="img" aria-label={`Fleet status: ${description}`}>
        {parts.map(({ key, label }) => (
          <div
            key={key}
            className={`fleet-seg seg-${key}`}
            style={{ flexGrow: summary[key] }}
            data-tip={`${label}: ${summary[key]} of ${summary.total}`}
            tabIndex={0}
          />
        ))}
      </div>

      <ul className="fleet-legend">
        {parts.map(({ key, label }) => (
          <li key={key}>
            <span className={`pill-dot dot-${key}`} />
            {label} <strong>{summary[key]}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
