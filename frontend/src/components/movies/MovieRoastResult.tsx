import type { MovieRoastData } from "../../integrations/movies";

interface MovieRoastResultProps {
  roastText: string;
  provider: string | null;
  data: MovieRoastData;
}

/** THE VERDICT — the centerpiece roast, plus the "evidence against you" facts. */
export function MovieRoastResult({ roastText, provider, data }: MovieRoastResultProps) {
  const evidence = buildEvidence(data);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-verdict/25 bg-gradient-to-b from-charcoal to-ink p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-verdict/20 blur-[100px]" />

      <div className="relative">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-verdict/40 bg-verdict/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-verdict">
          Case closed
        </span>
        <h2 className="mb-4 font-display text-2xl uppercase tracking-tight text-paper sm:text-3xl">
          The Verdict
        </h2>
        <p className="text-balance text-lg leading-relaxed text-paper sm:text-xl">
          {roastText}
        </p>
        {provider && (
          <p className="mt-4 font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">
            Roasted by: {provider}
          </p>
        )}

        {evidence.length > 0 && (
          <div className="mt-6 border-t border-line/60 pt-5">
            <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke">
              Evidence against you
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {evidence.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-line/70 bg-ink/40 px-3 py-2 text-sm text-paper"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function buildEvidence(data: MovieRoastData): string[] {
  const items: string[] = [`${data.totalMovies} movies watched`];

  if (data.topGenres[0] && data.evidence?.topGenrePercent !== undefined) {
    items.push(`${data.evidence.topGenrePercent}% ${data.topGenres[0]}`);
  }

  if (typeof data.averageRating === "number") {
    items.push(`Average rating: ${data.averageRating}/10`);
  }

  if (data.evidence?.oldMoviePercent !== undefined && data.evidence.oldMoviePercent > 0) {
    items.push(`${data.evidence.oldMoviePercent}% released before ${new Date().getFullYear() - 15}`);
  }

  if (data.evidence?.mostRewatched) {
    items.push(`${data.evidence.mostRewatched.title} rewatched ${data.evidence.mostRewatched.plays}x`);
  }

  if (data.evidence?.highRatingPercent !== undefined && data.evidence.highRatingPercent > 0) {
    items.push(`${data.evidence.highRatingPercent}% rated 8/10 or higher`);
  }

  return items;
}
