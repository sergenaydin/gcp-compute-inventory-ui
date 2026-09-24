import { describeEvent, statusGroup, type ActivityEvent } from "../lib";

interface Props {
  toasts: ActivityEvent[];
  onDismiss: (id: string) => void;
}

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} type="button" className="toast" onClick={() => onDismiss(toast.id)} title="Dismiss">
          <span className={`pill-dot dot-${statusGroup(toast.to ?? toast.from ?? "unknown")}`} />
          <span>
            <strong>{toast.name}</strong> {describeEvent(toast)}
          </span>
        </button>
      ))}
    </div>
  );
}
