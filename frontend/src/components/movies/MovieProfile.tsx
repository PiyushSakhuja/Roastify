import type { MovieRoastData } from "../../integrations/movies";

interface MovieProfileProps {
  data: MovieRoastData;
}

/** Profile Overview — username, totals, average rating, favorite genre/decade. */
export function MovieProfile({ data }: MovieProfileProps) {
  const initials = (data.username || "??").slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-line bg-charcoal-2 font-display text-lg text-smoke">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[var(--color-movies)]">
            Subject identified
          </p>
          <h2 className="truncate font-display text-2xl uppercase tracking-wide text-paper">
            {data.username || "Unknown viewer"}
          </h2>
          {data.username && (
            <a
              href={`https://trakt.tv/users/${encodeURIComponent(data.username)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-smoke hover:text-[var(--color-movies)]"
            >
              View Trakt profile &rarr;
            </a>
          )}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Movies watched" value={String(data.totalMovies)} />
        <Stat
          label="Average rating"
          value={typeof data.averageRating === "number" ? `${data.averageRating}/10` : "No ratings"}
        />
        <Stat label="Favorite genre" value={data.topGenres[0] ?? "Unclear"} />
        <Stat label="Favorite decade" value={data.favoriteDecades?.[0] ?? "Unclear"} />
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
