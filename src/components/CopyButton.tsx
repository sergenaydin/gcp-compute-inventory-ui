import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "./Icons";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={`icon-btn copy-btn${copied ? " is-copied" : ""}`}
      aria-label={copied ? "Copied" : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        navigator.clipboard?.writeText(value).then(() => setCopied(true), () => undefined);
      }}
    >
      {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
    </button>
  );
}
