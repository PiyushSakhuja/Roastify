// src/integrations/movies.ts
//
// Movie Roast integration. Like Steam, there's no OAuth here — the user
// provides a public Trakt username or profile URL, and every Trakt API
// call happens server-side (the backend holds TRAKT_CLIENT_ID). This
// module only ever talks to the Roastify backend, never Trakt directly.
//
// Kept provider-independent on purpose: MovieRoastData is the normalized
// shape the UI and AI both consume, regardless of which movie data source
// produced it. A future provider (TMDB account import, IMDb export, etc.)
// only needs to plug into the same shape server-side.

export interface Movie {
  title: string;
  year?: number;
  rating?: number;
  genres: string[];
  directors?: string[];
  plays?: number;
  lastWatchedAt?: string;
  runtime?: number;
  overview?: string;
  traktId?: number;
}

export interface MovieEvidence {
  totalPlays?: number;
  genreDistribution?: Record<string, number>;
  topGenrePercent?: number;
  oldMoviePercent?: number;
  newMoviePercent?: number;
  highRatingCount?: number;
  highRatingPercent?: number;
  mostRewatched?: { title: string; plays: number };
  topRated?: Array<{ title: string; rating?: number }>;
}

export interface MovieRoastData {
  username?: string;
  totalMovies: number;
  movies: Movie[];
  topGenres: string[];
  topDirectors: string[];
  topActors: string[];
  averageRating?: number;
  favoriteDecades?: string[];
  recentMovies?: string[];
  evidence?: MovieEvidence;
}

export class MovieProfilePrivateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MovieProfilePrivateError";
  }
}

export class MovieProfileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MovieProfileNotFoundError";
  }
}

export class MovieEmptyHistoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MovieEmptyHistoryError";
  }
}

function getBackendUrl(): string {
  return (window as any).ROASTIFY_BACKEND_URL || "http://localhost:8888";
}

/**
 * Robust fetch with exponential backoff. Only retries 429/5xx — retrying a
 * malformed request (4xx) won't help. Mirrors integrations/steam.ts so
 * every platform behaves identically under flaky network conditions.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
          continue;
        }
        return response; // Let the caller inspect the error body (e.g. 403 private profile).
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
    }
  }
  throw new Error("fetchWithRetry: exhausted retries");
}

function throwForErrorBody(data: any, fallback: string): never {
  if (data.code === "PROFILE_PRIVATE") {
    throw new MovieProfilePrivateError(data.error || fallback);
  }
  if (data.code === "PROFILE_NOT_FOUND") {
    throw new MovieProfileNotFoundError(data.error || fallback);
  }
  if (data.code === "EMPTY_HISTORY") {
    throw new MovieEmptyHistoryError(data.error || fallback);
  }
  throw new Error(data.details || data.error || fallback);
}

/** Fetches the full normalized movie profile (watched history + ratings) for a given profile input. */
export async function fetchMovieData(profileInput: string): Promise<MovieRoastData> {
  const url = new URL(`${getBackendUrl()}/api/movies/profile`);
  url.searchParams.set("profile", profileInput);

  const response = await fetchWithRetry(url.toString());
  const data = await response.json();

  if (!response.ok) {
    throwForErrorBody(data, "Failed to fetch movie data.");
  }

  return data as MovieRoastData;
}

/** Sends normalized movie data (or a raw profile as fallback) to the AI backend for a roast. */
export async function getRoastFromBackend(
  movieData: MovieRoastData,
  provider?: string
): Promise<{ roastText: string; provider?: string; movieData: MovieRoastData }> {
  const payload: Record<string, unknown> = { movieData };
  if (provider) payload.provider = provider;

  const response = await fetchWithRetry(`${getBackendUrl()}/api/movies/roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throwForErrorBody(result, "Backend failed to generate roast.");
  }

  return { roastText: result.roastText, provider: result.provider, movieData: result.movieData ?? movieData };
}

/** Full flow: fetch real movie data -> generate roast. */
export async function completeMovieRoastFlow(
  profileInput: string,
  provider?: string
): Promise<{ movieData: MovieRoastData; roastText: string; provider?: string }> {
  const movieData = await fetchMovieData(profileInput);
  const { roastText, provider: usedProvider } = await getRoastFromBackend(movieData, provider);
  return { movieData, roastText, provider: usedProvider };
}

/** Fetches which AI agents are configured on the backend (for a provider picker). Shared endpoint with Spotify/Steam. */
export async function fetchAvailableProviders(): Promise<
  Array<{ id: string; label: string; configured: boolean }>
> {
  const response = await fetch(`${getBackendUrl()}/api/providers`);
  if (!response.ok) throw new Error(`status ${response.status}`);
  const data = await response.json();
  return data.providers || [];
}
