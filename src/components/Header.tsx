import type { Theme } from "../hooks";
import { RefreshIcon, ServerIcon } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  projectId: string | null;
  live: boolean;
  onToggleLive: (value: boolean) => void;
  refreshing: boolean;
  updatedAt: Date | null;
  onRefresh: () => void;
  theme: Theme;
  onCycleTheme: () => void;
}

export function Header({ projectId, live, onToggleLive, refreshing, updatedAt, onRefresh, theme, onCycleTheme }: Props) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">
          <ServerIcon width={20} height={20} />
        </div>
        <div>
          <h1>Compute Inventory</h1>
          <p className="muted">
            Virtual machines across every zone
            {projectId && <span className="chip mono">{projectId}</span>}
          </p>
        </div>
      </div>

      <div className="header-actions">
        <label className="switch" title="Refresh automatically every 10 seconds (L)">
          <input type="checkbox" checked={live} onChange={(e) => onToggleLive(e.target.checked)} />
          <span className="switch-track" />
          <span className="switch-label">
            <span className={`live-dot${live ? " is-live" : ""}`} />
            Live
          </span>
        </label>

        <span className="muted updated" aria-live="polite">
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString()}` : "Not loaded yet"}
        </span>

        <ThemeToggle theme={theme} onCycle={onCycleTheme} />

        <button type="button" className="btn" onClick={onRefresh} disabled={refreshing} title="Refresh now (R)">
          <RefreshIcon className={refreshing ? "spin" : undefined} />
          Refresh
        </button>
      </div>
    </header>
  );
}
