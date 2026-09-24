import type { InstanceStatus } from "../api-types";
import { statusGroup } from "../lib";

const LABELS: Record<InstanceStatus, string> = {
  running: "Running",
  stopped: "Stopped",
  starting: "Starting",
  stopping: "Stopping",
  terminated: "Terminated",
  unknown: "Unknown",
};

export function StatusPill({ status }: { status: InstanceStatus }) {
  return (
    <span className={`pill pill-${statusGroup(status)}`}>
      <span className="pill-dot" />
      {LABELS[status]}
    </span>
  );
}
