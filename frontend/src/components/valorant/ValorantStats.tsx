import type { ValorantRoastData } from "../../integrations/valorant";

interface ValorantStatsProps {
  data: ValorantRoastData;
}

/** Performance Snapshot — win/loss split, K/D/A, headshot %, all from real calculated values. */
export function ValorantStats({ data }: ValorantStatsProps) {
  const { summary, matchesAnalyzed } = data;
  const winPct = matchesAnalyzed ? Math.round((summary.wins / matchesAnalyzed) * 100) : 0;

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-valorant)]">
        Performance Snapshot
      </p>

      {/* Win/loss bar — a single real-ratio bar, not a decorative progress meter. */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-paper">
            {summary.wins}W – {summary.losses}L
          </span>
          <span className="font-mono text-smoke-dim">{winPct}% win rate</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink/60">
          <div
            className="h-full bg-[var(--color-valorant)]"
            style={{ width: `${winPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Metric label="Avg. Kills" value={summary.averageKills} />
        <Metric label="Avg. Deaths" value={summary.averageDeaths} />
        <Metric label="Avg. Assists" value={summary.averageAssists} />
        <Metric
          label="Headshot %"
          value={typeof summary.averageHeadshotPercent === "number" ? `${summary.averageHeadshotPercent}%` : undefined}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line/70 bg-ink/40 p-2.5">
      <dt className="truncate font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">{label}</dt>
      <dd className="truncate text-sm font-semibold text-paper">{value ?? "—"}</dd>
    </div>
  );
}
