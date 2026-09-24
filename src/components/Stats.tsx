import type { Summary } from "../lib";

const CARDS: { key: keyof Summary; label: string; tone: string }[] = [
  { key: "total", label: "Total instances", tone: "accent" },
  { key: "running", label: "Running", tone: "running" },
  { key: "stopped", label: "Stopped", tone: "stopped" },
  { key: "transition", label: "Changing state", tone: "transition" },
];

export function Stats({ summary, loading }: { summary: Summary | null; loading: boolean }) {
  return (
    <section className="stats" aria-label="Summary">
      {CARDS.map(({ key, label, tone }) => (
        <div key={key} className={`card stat stat-${tone}`}>
          <span className="stat-label">{label}</span>
          {summary ? (
            <span key={summary[key]} className="stat-value pop">{summary[key]}</span>
          ) : loading ? (
            <span className="skeleton stat-skeleton" />
          ) : (
            <span className="stat-value muted">—</span>
          )}
        </div>
      ))}
    </section>
  );
}
