import { useMemo, useState } from "react";
import type { MovieRoastData } from "../../integrations/movies";
import { cx } from "../../lib/utils";

interface MovieShelfProps {
  data: MovieRoastData;
}

type SortMode = "rating" | "year" | "plays" | "title";

const SORT_LABELS: Record<SortMode, string> = {
  rating: "Highest rated",
  year: "Newest",
  plays: "Most rewatched",
  title: "A – Z",
};

/** Expandable, searchable, sortable, genre-filterable movie shelf. Collapsed by default — never dumps hundreds of movies at once. */
export function MovieShelf({ data }: MovieShelfProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("rating");
  const [genreFilter, setGenreFilter] = useState<string>("all");

  const movies = data.movies;

  const genreOptions = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => m.genres.forEach((g) => set.add(g)));
    return ["all", ...Array.from(set).sort()];
  }, [movies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = movies;
    if (q) list = list.filter((m) => m.title.toLowerCase().includes(q));
    if (genreFilter !== "all") list = list.filter((m) => m.genres.includes(genreFilter));

    list = [...list];
    if (sort === "rating") {
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (sort === "year") {
      list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    } else if (sort === "plays") {
      list.sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
    } else {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [movies, query, sort, genreFilter]);

  // Top4's four picks are already shown in "The Four" (MovieTaste) — a
  // searchable/filterable shelf adds nothing for a 4-item list.
  if (movies.length === 0 || data.source === "top4") return null;

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-movies)]">
            Movie shelf
          </p>
          <h3 className="mt-1 font-display text-lg uppercase tracking-wide text-paper">
            {movies.length} movies on file
          </h3>
        </div>
        <span
          className={cx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-smoke transition-transform",
            expanded && "rotate-180"
          )}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="mt-5">
          <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your shelf..."
              className="w-full flex-1 rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-dim focus:outline-none focus:border-[var(--color-movies)]"
            />
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-paper focus:outline-none focus:border-[var(--color-movies)]"
            >
              {genreOptions.map((g) => (
                <option key={g} value={g}>
                  {g === "all" ? "All genres" : g}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSort(mode)}
                className={cx(
                  "rounded-full border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wide transition",
                  sort === mode
                    ? "border-[var(--color-movies)] bg-[var(--color-movies)]/10 text-paper"
                    : "border-line text-smoke hover:text-paper"
                )}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>

          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-smoke-dim">No movies match your search.</p>
            ) : (
              filtered.map((movie, i) => (
                <div
                  key={`${movie.title}-${movie.year ?? i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-ink/30 px-3 py-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-paper">{movie.title}</span>
                    <span className="truncate font-mono text-[0.6rem] text-smoke-dim">
                      {[movie.year, movie.genres[0]].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[var(--color-movies)]">
                    {typeof movie.rating === "number" ? `${movie.rating}/10` : movie.plays && movie.plays > 1 ? `${movie.plays}x` : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
