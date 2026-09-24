import { describeEvent, relativeTime, statusGroup, type ActivityEvent } from "../lib";
import { ActivityIcon } from "./Icons";

interface Props {
  events: ActivityEvent[];
  now: Date;
  onSelect: (instanceId: string) => void;
}

export function ActivityFeed({ events, now, onSelect }: Props) {
  return (
    <section className="card activity" aria-label="Recent activity">
      <header className="activity-head">
        <ActivityIcon width={16} height={16} />
        <h2>Recent activity</h2>
        <span className="muted small">changes seen while this page is open</span>
      </header>

      {events.length === 0 ? (
        <p className="muted activity-empty">
          No changes yet. Start or stop a VM (for example with <span className="mono">gcloud compute instances stop</span>)
          and it will show up here within seconds.
        </p>
      ) : (
        <ul className="activity-list">
          {events.slice(0, 8).map((event) => (
            <li key={event.id}>
              <button type="button" className="activity-item" onClick={() => onSelect(event.instanceId)}>
                <span className={`pill-dot dot-${statusGroup(event.to ?? event.from ?? "unknown")}`} />
                <span className="activity-text">
                  <strong>{event.name}</strong> <span className="muted">{describeEvent(event)}</span>
                </span>
                <time className="muted small" dateTime={event.at.toISOString()} title={event.at.toLocaleString()}>
                  {event.at.toLocaleTimeString()} · {relativeTime(event.at.toISOString(), now)}
                </time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
