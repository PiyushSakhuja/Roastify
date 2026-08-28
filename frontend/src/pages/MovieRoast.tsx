import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useMovieRoast } from "../hooks/useMovieRoast";
import { fetchAvailableProviders, type MovieRoastData } from "../integrations/movies";
import { MovieSourceSelector, type MovieSourceChoice } from "../components/movies/MovieSourceSelector";
import { LetterboxdUploader } from "../components/movies/LetterboxdUploader";
import { Top4Selector } from "../components/movies/Top4Selector";
import { MovieProfile } from "../components/movies/MovieProfile";
import { MovieTaste } from "../components/movies/MovieTaste";
import { MovieRoastResult } from "../components/movies/MovieRoastResult";
import { MovieShelf } from "../components/movies/MovieShelf";
import { MovieStats } from "../components/movies/MovieStats";

interface ProviderOption {
  id: string;
  label: string;
  configured: boolean;
}

const LOADING_MESSAGES = [
  "Examining your questionable taste...",
  "Checking how many 9/10s you've handed out...",
  "Investigating your Letterboxd-era personality...",
  "Finding your cinematic crimes...",
  "Preparing the verdict...",
];

const SHARE_SOURCE_LABEL: Record<string, string> = {
  trakt: "Roasted from my Trakt history",
  letterboxd: "Roasted from my Letterboxd history",
  top4: "Roasted from my Top 4",
};

/** Screens shown before movie.status takes over (idle -> source-specific input -> hand off to the hook). */
type PreRoastScreen = "source-select" | "trakt-connect" | "letterboxd-upload" | "top4-input";

export function MovieRoastPage() {
  const movie = useMovieRoast();
  const [screen, setScreen] = useState<PreRoastScreen>("source-select");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  const isLoading = movie.status === "fetching-profile" || movie.status === "generating-roast";

  useEffect(() => {
    fetchAvailableProviders()
      .then((list) => setProviders(list.filter((p) => p.configured)))
      .catch((err) => console.warn("Could not load provider list, defaulting to Auto:", err));
  }, []);

  // Restrained loading-message rotation — informative, not overly animated.
  useEffect(() => {
    if (!isLoading) return;
    let i = 0;
    setLoadingMessage(LOADING_MESSAGES[0]);
    const interval = window.setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[i]);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [isLoading]);

  const shareText = useMemo(() => {
    if (!movie.roastText || !movie.movieData) return "";
    const source = movie.movieData.source ?? "trakt";
    const countLine =
      source === "top4"
        ? `${movie.movieData.movies.length} movies analyzed.`
        : `${movie.movieData.totalMovies} movies watched.`;
    return `${SHARE_SOURCE_LABEL[source]}:\n\n"${movie.roastText}"\n\n${countLine}`;
  }, [movie.roastText, movie.movieData]);

  function handleShare() {
    if (navigator.share && shareText) {
      navigator.share({ text: shareText }).catch(() => {});
    } else if (shareText) {
      navigator.clipboard?.writeText(shareText);
    }
  }

  function handleSelectSource(source: MovieSourceChoice) {
    if (source === "trakt") setScreen("trakt-connect");
    else if (source === "letterboxd") setScreen("letterboxd-upload");
    else setScreen("top4-input");
  }

  function handleBackToSourceSelect() {
    setScreen("source-select");
    movie.reset();
  }

  function handleNormalizedData(data: MovieRoastData) {
    movie.connectWithData(data, selectedProvider || undefined);
  }

  function handleReset() {
    setScreen("source-select");
    movie.reset();
  }

  const activeSource = movie.movieData?.source ?? (screen === "trakt-connect" ? "trakt" : undefined);

  return (
    <div className="min-h-screen bg-ink">
      <div className="grain" />

      {/* Header */}
      <header className="border-b border-line/60 px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-smoke transition hover:text-paper"
          >
            &larr; Back to Roastify
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl uppercase tracking-tight text-paper sm:text-3xl">
                Movie Roast
              </h1>
              <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-smoke-dim">
                Case file: your watch history
              </p>
            </div>
            {movie.movieData && (
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-charcoal-2 font-display text-xs text-smoke">
                  {(movie.movieData.username || "??").slice(0, 2).toUpperCase()}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-paper">
                    {movie.movieData.username || (activeSource === "top4" ? "Top 4" : "Imported")}
                  </p>
                  <span className="inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-wider text-acid">
                    <span className="h-1.5 w-1.5 rounded-full bg-acid" />
                    Connected
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {/* Source selection — the entry screen */}
        {movie.status === "idle" && screen === "source-select" && (
          <MovieSourceSelector onSelect={handleSelectSource} />
        )}

        {/* Trakt: existing connection form, unchanged behavior */}
        {movie.status === "idle" && screen === "trakt-connect" && (
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={handleBackToSourceSelect}
              className="mb-5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-smoke transition hover:text-paper"
            >
              &larr; Choose a different source
            </button>
            <div className="rounded-2xl border border-line bg-charcoal/80 p-6 sm:p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-[var(--color-movies)]/10">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--color-movies)]" fill="none">
                  <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M4 9h16" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 5v4M13 5v4" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </div>
              {providers.length > 0 && (
                <div className="mb-5">
                  <label htmlFor="provider-select" className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-smoke">
                    AI Agent
                  </label>
                  <select
                    id="provider-select"
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-paper focus:outline-none focus:border-[var(--color-movies)]"
                  >
                    <option value="">Auto (first available)</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <MovieStats
                onSubmit={(profile) => movie.connect(profile, selectedProvider || undefined)}
              />
            </div>
          </div>
        )}

        {/* Letterboxd: CSV drag-and-drop, parsed client-side */}
        {movie.status === "idle" && screen === "letterboxd-upload" && (
          <LetterboxdUploader onParsed={handleNormalizedData} onBack={handleBackToSourceSelect} />
        )}

        {/* Top 4: four plain title inputs, no account/API required */}
        {movie.status === "idle" && screen === "top4-input" && (
          <Top4Selector onSubmit={handleNormalizedData} onBack={handleBackToSourceSelect} />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-[var(--color-movies)]" />
            <p className="font-mono text-sm uppercase tracking-wide text-paper">{loadingMessage}</p>
          </div>
        )}

        {/* Private profile (Trakt) */}
        {movie.status === "private" && (
          <div className="mx-auto max-w-md rounded-2xl border border-verdict/40 bg-verdict/5 p-6 sm:p-8">
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-verdict">
              Access denied
            </p>
            <p className="mb-4 text-paper">{movie.errorMessage}</p>
            <div className="mb-5 rounded-lg border border-line/70 bg-ink/40 p-4 text-sm text-smoke">
              <p className="mb-2 font-semibold text-paper">To fix this:</p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>Open Trakt and go to your account settings.</li>
                <li>Under Privacy, set your profile and watch history to public.</li>
                <li>Come back and try again.</li>
              </ol>
            </div>
            <button
              type="button"
              onClick={() => setScreen("trakt-connect")}
              className="w-full rounded-full border border-line px-6 py-3 text-sm font-medium text-paper transition hover:border-smoke-dim"
            >
              Try another profile
            </button>
          </div>
        )}

        {/* Profile not found (Trakt) */}
        {movie.status === "not-found" && (
          <div className="mx-auto max-w-md rounded-2xl border border-verdict/40 bg-verdict/5 p-6 sm:p-8">
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-verdict">
              Profile not found
            </p>
            <p className="mb-4 text-paper">{movie.errorMessage}</p>
            <button
              type="button"
              onClick={() => setScreen("trakt-connect")}
              className="w-full rounded-full border border-line px-6 py-3 text-sm font-medium text-paper transition hover:border-smoke-dim"
            >
              Try another profile
            </button>
          </div>
        )}

        {/* Empty watch history (Trakt) */}
        {movie.status === "empty" && (
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-charcoal/80 p-6 sm:p-8">
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-smoke">
              Nothing to roast
            </p>
            <p className="mb-4 text-paper">{movie.errorMessage}</p>
            <button
              type="button"
              onClick={() => setScreen("trakt-connect")}
              className="w-full rounded-full border border-line px-6 py-3 text-sm font-medium text-paper transition hover:border-smoke-dim"
            >
              Try another profile
            </button>
          </div>
        )}

        {/* Error */}
        {movie.status === "error" && (
          <div className="mx-auto max-w-md rounded-2xl border border-verdict/40 bg-verdict/5 p-6 sm:p-8">
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-verdict">
              Something went wrong
            </p>
            <p className="mb-4 text-paper">
              {movie.errorMessage ?? "An unexpected error occurred. Please try again."}
            </p>
            <button
              type="button"
              onClick={handleBackToSourceSelect}
              className="w-full rounded-full border border-line px-6 py-3 text-sm font-medium text-paper transition hover:border-smoke-dim"
            >
              Try again
            </button>
          </div>
        )}

        {/* Done — full results, adapted per source by the components themselves */}
        {movie.status === "done" && movie.movieData && movie.roastText && (
          <div className="space-y-5">
            <MovieProfile data={movie.movieData} />
            <MovieTaste data={movie.movieData} />
            <MovieRoastResult
              roastText={movie.roastText}
              provider={movie.provider}
              data={movie.movieData}
            />
            <MovieShelf data={movie.movieData} />

            {/* Actions */}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => movie.regenerate(selectedProvider || undefined)}
                className="flex-1 rounded-full bg-verdict px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                Roast Me Again
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 rounded-full border border-line bg-charcoal-2 px-5 py-3 text-sm font-medium text-paper transition hover:border-smoke-dim"
              >
                Share Roast
              </button>
              {movie.movieData.source !== "top4" && movie.movieData.username && (
                <a
                  href={`https://trakt.tv/users/${encodeURIComponent(movie.movieData.username)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-full border border-line bg-charcoal-2 px-5 py-3 text-center text-sm font-medium text-paper transition hover:border-smoke-dim"
                >
                  View Profile
                </a>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 rounded-full border border-line px-5 py-3 text-center text-sm font-medium text-smoke transition hover:text-paper"
              >
                Try a different source
              </button>
              <Link
                to="/"
                className="flex-1 rounded-full border border-line px-5 py-3 text-center text-sm font-medium text-smoke transition hover:text-paper"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
