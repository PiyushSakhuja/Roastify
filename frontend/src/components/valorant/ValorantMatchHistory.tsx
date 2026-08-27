import { cx } from "../../lib/utils";
import type { ValorantRoastData } from "../../integrations/valorant";

interface ValorantMatchHistoryProps {
  data: ValorantRoastData;
}

/** Compact recent-match timeline: W/L pips plus a short list, never a dump. */
export function ValorantMatchHistory({ data }: ValorantMatchHistoryProps) {
  const matches = data.recentMatches;
  if (matches.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-valorant)]">
        Match History
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {matches.map((m, i) => (
          <span
            key={i}
            className={cx(
              "flex h-7 w-7 items-center justify-center rounded-md font-mono text-[0.65rem] font-bold",
              m.result === "win"
                ? "bg-acid/15 text-acid"
                : "bg-verdict/15 text-verdict"
            )}
            title={`${m.result === "win" ? "Win" : "Loss"}${m.map ? ` on ${m.map}` : ""}`}
          >
            {m.result === "win" ? "W" : "L"}
          </span>
        ))}
      </div>

      <ul className="space-y-1.5">
        {matches.slice(0, 6).map((m, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-ink/30 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cx(
                  "shrink-0 rounded px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase",
                  m.result === "win" ? "bg-acid/15 text-acid" : "bg-verdict/15 text-verdict"
                )}
              >
                {m.result}
              </span>
              <span className="truncate text-sm text-paper">
                {[m.agent, m.map].filter(Boolean).join(" · ") || "—"}
              </span>
            </div>
            {(typeof m.kills === "number" || typeof m.deaths === "number") && (
              <span className="shrink-0 font-mono text-xs text-smoke-dim">
                {m.kills ?? "?"}/{m.deaths ?? "?"}/{m.assists ?? "?"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
