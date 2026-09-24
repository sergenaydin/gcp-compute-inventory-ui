import type { Theme } from "../hooks";
import { MonitorIcon, MoonIcon, SunIcon } from "./Icons";

const NEXT: Record<Theme, string> = { system: "light", light: "dark", dark: "system" };

export function ThemeToggle({ theme, onCycle }: { theme: Theme; onCycle: () => void }) {
  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;
  return (
    <button
      type="button"
      className="btn btn-icon"
      onClick={onCycle}
      aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}
      title={`Theme: ${theme} (click for ${NEXT[theme]})`}
    >
      <Icon />
    </button>
  );
}
