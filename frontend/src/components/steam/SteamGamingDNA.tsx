import type { SteamRoastData } from "../../integrations/steam";

interface SteamGamingDNAProps {
  data: SteamRoastData;
}

/** Gaming DNA — calculated insights, only ones backed by real data. */
export function SteamGamingDNA({ data }: SteamGamingDNAProps) {
  const mostPlayed = data.topGames[0];
  const topFive = data.topGames.slice(0, 5);
  const playedCount = data.totalGames - (data.unplayedGames ?? 0);

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-steam)]">
        Gaming DNA
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2.5">
          {mostPlayed && (
            <Fact label="Most played" value={`${mostPlayed.name} — ${Math.round(mostPlayed.playtimeHours)}h`} />
          )}
          <Fact label="Total gaming hours" value={`${Math.round(data.totalPlaytimeHours)}h`} />
          <Fact
            label="Games owned vs. played"
            value={`${data.totalGames} owned, ${playedCount} actually touched`}
          />
          {typeof data.achievements === "number" && (
            <Fact label="Achievements unlocked" value={String(data.achievements)} />
          )}
        </div>

        <div>
          <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">
            Top 5 by playtime
          </p>
          <ol className="space-y-1.5">
            {topFive.map((game, i) => (
              <li
                key={game.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-ink/40 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-paper">
                  <span className="font-mono text-[0.65rem] text-smoke-dim">{i + 1}</span>
                  <span className="truncate">{game.name}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-[var(--color-steam)]">
                  {Math.round(game.playtimeHours)}h
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line/70 bg-ink/40 px-3 py-2.5">
      <p className="font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-paper">{value}</p>
    </div>
  );
}
