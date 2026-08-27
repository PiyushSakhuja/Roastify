import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useSteamRoast } from "../hooks/useSteamRoast";
import { fetchAvailableProviders } from "../integrations/steam";
import { SteamStats } from "../components/steam/SteamStats";
import { SteamProfile } from "../components/steam/SteamProfile";
import { SteamGamingDNA } from "../components/steam/SteamGamingDNA";
import { SteamLibrary } from "../components/steam/SteamLibrary";
import { SteamRoastResult } from "../components/steam/SteamRoastResult";

interface ProviderOption {
  id: string;
  label: string;
  configured: boolean;
}

const LOADING_MESSAGES = [
  "Opening your Steam library...",
  "Counting games you bought and never played...",
  "Calculating your backlog...",
  "Finding evidence...",
  "Judging your gaming decisions...",
];

export function SteamRoastPage() {
  const steam = useSteamRoast();
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  const isLoading = steam.status === "fetching-profile" || steam.status === "generating-roast";

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
    if (!steam.roastText || !steam.steamData) return "";
    return `Roastify just roasted my Steam library:\n\n"${steam.roastText}"\n\n${steam.steamData.totalGames} games owned, ${Math.round(steam.steamData.totalPlaytimeHours)} hours played.`;
  }, [steam.roastText, steam.steamData]);

  function handleShare() {
    if (navigator.share && shareText) {
      navigator.share({ text: shareText }).catch(() => {});
    } else if (shareText) {
      navigator.clipboard?.writeText(shareText);
    }
  }

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
                Steam Roast
              </h1>
              <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-smoke-dim">
                Case file: your gaming library
              </p>
            </div>
            {steam.steamData && (
              <div className="flex items-center gap-2.5">
                {steam.steamData.avatar && (
                  <img
                    src={steam.steamData.avatar}
                    alt=""
                    className="h-9 w-9 rounded-full border border-line object-cover"
                    draggable={false}
                  />
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold text-paper">{steam.steamData.username}</p>
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
        {/* Idle: connection form */}
        {steam.status === "idle" && (
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-charcoal/80 p-6 sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-[var(--color-steam)]/10">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--color-steam)]" fill="none">
                <circle cx="9" cy="15" r="2.4" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="15.5" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10.9 13.7 13.4 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
                  className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2.5 text-sm text-paper focus:outline-none focus:border-[var(--color-steam)]"
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
            <SteamStats
              onSubmit={(profile) => steam.connect(profile, selectedProvider || undefined)}
            />
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-[var(--color-steam)]" />
            <p className="font-mono text-sm uppercase tracking-wide text-paper">{loadingMessage}</p>
          </div>
        )}

        {/* Private profile */}
        {steam.status === "private" && (
          <div className="mx-auto max-w-md rounded-2xl border border-verdict/40 bg-verdict/5 p-6 sm:p-8">
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-verdict">
              Access denied
            </p>
            <p className="mb-4 text-paper">{steam.errorMessage}</p>
            <div className="mb-5 rounded-lg border border-line/70 bg-ink/40 p-4 text-sm text-smoke">
              <p className="mb-2 font-semibold text-paper">To fix this:</p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>Open Steam and go to your profile.</li>
                <li>Click Edit Profile &rarr; Privacy Settings.</li>
                <li>Set "My profile" and "Game details" to Public.</li>
                <li>Come back and try again.</li>
              </ol>
            </div>
            <button
              type="button"
              onClick={steam.reset}
              className="w-full rounded-full border border-line px-6 py-3 text-sm font-medium text-paper transition hover:border-smoke-dim"
            >
              Try another profile
            </button>
          </div>
        )}

        {/* Error */}
        {steam.status === "error" && (
          <div className="mx-auto max-w-md rounded-2xl border border-verdict/40 bg-verdict/5 p-6 sm:p-8">
            <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-wider text-verdict">
              Something went wrong
            </p>
            <p className="mb-4 text-paper">
              {steam.errorMessage ?? "An unexpected error occurred. Please try again."}
            </p>
            <button
              type="button"
              onClick={steam.reset}
              className="w-full rounded-full border border-line px-6 py-3 text-sm font-medium text-paper transition hover:border-smoke-dim"
            >
              Try again
            </button>
          </div>
        )}

        {/* Done — full results */}
        {steam.status === "done" && steam.steamData && steam.roastText && (
          <div className="space-y-5">
            <SteamProfile data={steam.steamData} />
            <SteamGamingDNA data={steam.steamData} />
            <SteamRoastResult
              roastText={steam.roastText}
              provider={steam.provider}
              data={steam.steamData}
            />
            <SteamLibrary data={steam.steamData} />

            {/* Actions */}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => steam.regenerate(selectedProvider || undefined)}
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
              {steam.steamData.profileUrl && (
                <a
                  href={steam.steamData.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-full border border-line bg-charcoal-2 px-5 py-3 text-center text-sm font-medium text-paper transition hover:border-smoke-dim"
                >
                  View Steam Profile
                </a>
              )}
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
