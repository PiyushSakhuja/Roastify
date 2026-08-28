// src/integrations/top4.ts
//
// "Top 4" mode: the zero-friction path. No account, no API — the user
// just types four movie titles. Since this project has no TMDB (or other
// metadata provider) configured, per spec we keep this simple and use the
// entered titles directly rather than inventing genres/directors/years
// that were never confirmed. If a metadata provider is added later, this
// is the single place that would call it to enrich each pick.

import type { Movie, MovieRoastData } from "./movies";

export class InvalidTop4Error extends Error {
  constructor(message = "Enter all four movies before requesting your roast.") {
    super(message);
    this.name = "InvalidTop4Error";
  }
}

/**
 * Builds MovieRoastData from exactly four user-entered titles. Deliberately
 * does NOT synthesize totals like "347 movies watched" — totalMovies here
 * genuinely means "4," and the UI/prompt both treat this as a small,
 * personality-focused sample rather than a full watch history.
 */
export function buildTop4Data(titles: string[]): MovieRoastData {
  const cleaned = titles.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length !== 4) {
    throw new InvalidTop4Error();
  }

  const movies: Movie[] = cleaned.map((title) => ({
    title,
    genres: [],
  }));

  return {
    source: "top4",
    totalMovies: movies.length,
    movies,
    topGenres: [],
    topDirectors: [],
    topActors: [],
    // No averageRating/favoriteDecades for Top4 — the user didn't rate
    // anything and we have no year data without a metadata provider, so
    // there's nothing real to report here.
  };
}
