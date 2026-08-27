import type { MovieRoastData } from "../../integrations/movies";

interface MovieTasteProps {
  data: MovieRoastData;
}

/**
 * Derives a short taste-profile label purely from real calculated
 * patterns in the data — never a canned/random label. Each label has a
 * concrete numeric condition attached to it.
 */
function deriveTasteProfile(data: MovieRoastData): { label: string; reason: string } | null {
  const { evidence, totalMovies, averageRating } = data;
  if (!totalMovies) return null;

  if (evidence?.highRatingPercent !== undefined && evidence.highRatingPercent >= 70) {
    return {
      label: "THE 8/10 MERCHANT",
      reason: `${evidence.highRatingPercent}% of your ratings are 8/10 or higher.`,
    };
  }

  if (evidence?.oldMoviePercent !== undefined && evidence.oldMoviePercent >= 60) {
    return {
      label: "THE PRETENTIOUS CIN\u00c9PHILE",
      reason: `${evidence.oldMoviePercent}% of what you watch is 15+ years old.`,
    };
  }

  if (evidence?.newMoviePercent !== undefined && evidence.newMoviePercent >= 80) {
    return {
      label: "THE ALGORITHM'S PUPPET",
      reason: `${evidence.newMoviePercent}% of what you watch came out in the last 15 years.`,
    };
  }

  if (evidence?.topGenrePercent !== undefined && evidence.topGenrePercent >= 50 && data.topGenres[0]) {
    return {
      label: `THE ${data.topGenres[0].toUpperCase()} LIFER`,
      reason: `${evidence.topGenrePercent}% of your history is ${data.topGenres[0]}.`,
    };
  }

  if (evidence?.mostRewatched && evidence.mostRewatched.plays >= 5) {
    return {
      label: "THE COMFORT-MOVIE ADDICT",
      reason: `You've rewatched ${evidence.mostRewatched.title} ${evidence.mostRewatched.plays} times.`,
    };
  }

  if (typeof averageRating === "number" && averageRating <= 5) {
    return {
      label: "THE PROFESSIONAL DISAPPOINTED PERSON",
      reason: `Your average rating is ${averageRating}/10.`,
    };
  }

  return {
    label: "THE UNCLASSIFIABLE VIEWER",
    reason: "Your taste doesn't fit a single obvious pattern — that's its own kind of statement.",
  };
}

/** Movie Taste — top genres, rating spread, recent watches, using only real calculated values. */
export function MovieTaste({ data }: MovieTasteProps) {
  const profile = deriveTasteProfile(data);
  const genreEntries = Object.entries(data.evidence?.genreDistribution || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {profile && (
        <div className="rounded-2xl border border-[var(--color-movies)]/30 bg-[var(--color-movies)]/5 p-5 sm:p-6">
          <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-movies)]">
            Taste profile
          </p>
          <h3 className="font-display text-xl uppercase tracking-tight text-paper sm:text-2xl">
            {profile.label}
          </h3>
          <p className="mt-1.5 text-sm text-smoke">{profile.reason}</p>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
        <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-movies)]">
          Movie Taste
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">
              Genre breakdown
            </p>
            {genreEntries.length > 0 ? (
              <ul className="space-y-1.5">
                {genreEntries.map(([genre, pct]) => (
                  <li
                    key={genre}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-ink/40 px-3 py-2"
                  >
                    <span className="truncate text-sm text-paper">{genre}</span>
                    <span className="shrink-0 font-mono text-xs text-[var(--color-movies)]">{pct}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-smoke-dim">Not enough genre data yet.</p>
            )}
          </div>

          <div>
            <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">
              Recently watched
            </p>
            {data.recentMovies && data.recentMovies.length > 0 ? (
              <ul className="space-y-1.5">
                {data.recentMovies.slice(0, 5).map((title, i) => (
                  <li
                    key={`${title}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-line/70 bg-ink/40 px-3 py-2"
                  >
                    <span className="font-mono text-[0.65rem] text-smoke-dim">{i + 1}</span>
                    <span className="truncate text-sm text-paper">{title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-smoke-dim">No recent activity on record.</p>
            )}
          </div>
        </div>

        {(data.topDirectors.length > 0 || data.topActors.length > 0) && (
          <div className="mt-5 grid gap-5 border-t border-line/60 pt-5 sm:grid-cols-2">
            {data.topDirectors.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">
                  Favorite directors
                </p>
                <p className="text-sm text-paper">{data.topDirectors.join(", ")}</p>
              </div>
            )}
            {data.topActors.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">
                  Favorite actors
                </p>
                <p className="text-sm text-paper">{data.topActors.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
