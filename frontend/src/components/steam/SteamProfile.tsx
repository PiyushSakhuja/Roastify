import type { SteamRoastData } from "../../integrations/steam";

interface SteamProfileProps {
  data: SteamRoastData;
}

/** Profile Overview — username, avatar, totals, account age, recent activity. */
export function SteamProfile({ data }: SteamProfileProps) {
  const mostRecentGame = data.recentlyPlayed[0]?.name;

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {data.avatar ? (
          <img
            src={data.avatar}
            alt={`${data.username} avatar`}
            className="h-16 w-16 shrink-0 rounded-xl border border-line object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-line bg-charcoal-2 font-display text-lg text-smoke">
            {data.username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[var(--color-steam)]">
            Subject identified
          </p>
          <h2 className="truncate font-display text-2xl uppercase tracking-wide text-paper">
            {data.username}
          </h2>
          {data.profileUrl && (
            <a
              href={data.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-smoke hover:text-[var(--color-steam)]"
            >
              View Steam profile &rarr;
            </a>
          )}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Total games" value={String(data.totalGames)} />
        <Stat label="Total playtime" value={`${Math.round(data.totalPlaytimeHours)}h`} />
        <Stat label="Account age" value={data.accountAge ?? "Unknown"} />
        <Stat label="Recently played" value={mostRecentGame ?? "None"} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line/70 bg-ink/40 p-2.5">
      <dt className="truncate font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">
        {label}
      </dt>
      <dd className="truncate text-sm font-semibold text-paper">{value}</dd>
    </div>
  );
}
