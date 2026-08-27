import type { ValorantRoastData } from "../../integrations/valorant";

interface ValorantMapsProps {
  data: ValorantRoastData;
}

/** Map performance — real win rate per map, no decorative meaningless bars. */
export function ValorantMaps({ data }: ValorantMapsProps) {
  if (data.maps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-valorant)]">
        Map Performance
      </p>
      <ul className="space-y-1.5">
        {data.maps.map((map) => (
          <li
            key={map.name}
            className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-ink/40 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-paper">{map.name}</p>
              <p className="font-mono text-[0.6rem] text-smoke-dim">
                {map.wins}W – {map.games - map.wins}L
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs text-[var(--color-valorant)]">
              {typeof map.winRate === "number" ? `${map.winRate}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
