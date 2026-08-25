import { cx } from "../lib/utils";
import type { ConnectionState } from "../types/platform";

interface ConnectionButtonProps {
  state: ConnectionState;
  accent: string;
  onConnect?: () => void;
}

export function ConnectionButton({
  state,
  accent,
  onConnect,
}: ConnectionButtonProps) {
  if (state === "coming-soon") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-smoke-dim">
        Sealed
      </span>
    );
  }

  if (state === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-acid/15 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-acid">
        <span className="h-1.5 w-1.5 rounded-full bg-acid" />
        Connected
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onConnect}
      style={{ ["--accent" as string]: `var(--color-${accent})` }}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-smoke",
        "transition hover:border-[var(--accent)] hover:text-paper"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-smoke-dim" />
      Connect
    </button>
  );
}
