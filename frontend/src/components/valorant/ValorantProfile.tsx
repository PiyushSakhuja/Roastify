import type { ValorantRoastData } from "../../integrations/valorant";

interface ValorantProfileProps {
  data: ValorantRoastData;
}

/** Player Overview — Riot ID, matches analyzed, win rate, K/D, region. */
export function ValorantProfile({ data }: ValorantProfileProps) {
  const kd =
    typeof data.summary.averageKills === "number" && typeof data.summary.averageDeaths === "number" && data.summary.averageDeaths > 0
      ? Math.round((data.summary.averageKills / data.summary.averageDeaths) * 100) / 100
      : undefined;

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[var(--color-valorant)]">
            Agent identified
          </p>
          <h2 className="truncate font-display text-2xl uppercase tracking-wide text-paper">
            {data.riotId}
          </h2>
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-smoke-dim">
            Region: {data.region}
          </p>
        </div>
        {data.isMock && (
          <span className="shrink-0 rounded-full border border-verdict/40 bg-verdict/10 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wide text-verdict">
            Mock data
          </span>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Matches analyzed" value={String(data.matchesAnalyzed)} />
        <Stat label="Win rate" value={typeof data.summary.winRate === "number" ? `${data.summary.winRate}%` : "—"} />
        <Stat label="K/D" value={typeof kd === "number" ? kd.toFixed(2) : "—"} />
        <Stat
          label="Headshot %"
          value={typeof data.summary.averageHeadshotPercent === "number" ? `${data.summary.averageHeadshotPercent}%` : "—"}
        />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line/70 bg-ink/40 p-2.5">
      <dt className="truncate font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">{label}</dt>
      <dd className="truncate text-sm font-semibold text-paper">{value}</dd>
    </div>
  );
}
