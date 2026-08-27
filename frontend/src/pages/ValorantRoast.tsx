import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useValorantRoast } from "../hooks/useValorantRoast";
import { ValorantIcon } from "../components/icons";
import { ValorantProfile } from "../components/valorant/ValorantProfile";
import { ValorantStats } from "../components/valorant/ValorantStats";
import { ValorantAgents } from "../components/valorant/ValorantAgents";
import { ValorantMaps } from "../components/valorant/ValorantMaps";
import { ValorantMatchHistory } from "../components/valorant/ValorantMatchHistory";
import { ValorantRoastResult } from "../components/valorant/ValorantRoastResult";

const LOADING_MESSAGES = [
  "Reviewing your match history...",
  "Checking who you're blaming for those losses...",
  "Analyzing your agent addiction...",
  "Calculating your questionable decisions...",
  "Preparing the verdict...",
];

function useRotatingMessage(active: boolean, messages: string[], intervalMs = 1800) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs);
    return () => window.clearInterval(id);
  }, [active, messages, intervalMs]);
  return messages[index];
}

export function ValorantRoastPage() {
  const valorant = useValorantRoast();
  const isLoading = valorant.status === "authenticating" || valorant.status === "generating-roast";
  const loadingMessage = useRotatingMessage(isLoading, LOADING_MESSAGES);

  const shareText = useMemo(() => {
    if (!valorant.roastText || !valorant.profile) return "";
    return `Roastify just roasted my VALORANT stats:\n\n"${valorant.roastText}"\n\n${valorant.profile.matchesAnalyzed} matches analyzed.`;
  }, [valorant.roastText, valorant.profile]);

  function handleShare() {
    if (navigator.share && shareText) {
      navigator.share({ text: shareText }).catch(() => {});
    } else if (shareText) {
      navigator.clipboard?.writeText(shareText).catch(() => {});
    }
  }

  return (
    <div className="min-h-screen bg-ink">
      <div className="grain" />

      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-sm text-smoke transition-colors hover:text-paper">
            &larr; Back to Roastify
          </Link>

          <div className="flex items-center gap-2 text-sm text-paper">
            <ValorantIcon className="h-5 w-5 text-[var(--color-valorant)]" />
            <span className="font-medium">VALORANT Roast</span>
          </div>

          <div className="font-mono text-xs uppercase tracking-wide">
            {valorant.status === "done" ? (
              <span className="flex items-center gap-1.5 text-[var(--color-acid)]">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Connected
                {valorant.profile?.isMock && (
                  <span className="ml-1 rounded-full border border-verdict/40 bg-verdict/10 px-1.5 py-0.5 text-verdict">
                    Mock
                  </span>
                )}
              </span>
            ) : (
              <span className="text-smoke-dim">Not connected</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Idle: connect */}
        {valorant.status === "idle" && (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-line text-[var(--color-valorant)]">
              <ValorantIcon className="h-6 w-6" />
            </div>
            <h1 className="mb-2 font-display text-2xl uppercase tracking-wide text-paper">
              Connect Riot Account
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-smoke">
              We'll ask Riot to let you sign in and share your own match history — then hand your
              real stats to an AI that isn't going to be nice about it.
            </p>
            <button
              type="button"
              onClick={valorant.connect}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-valorant)] px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:brightness-110"
            >
              <ValorantIcon className="h-4 w-4" />
              Connect Riot Account
            </button>
            <p className="mt-4 text-xs text-smoke-dim">
              You'll be redirected to Riot Sign On. Roastify never sees your password, and only
              reads match data you explicitly authorize.
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="mx-auto max-w-md py-20 text-center">
            <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-[var(--color-valorant)]" />
            <p className="font-mono text-sm text-smoke">{loadingMessage}</p>
          </div>
        )}

        {/* Not configured — never fakes a connection */}
        {valorant.status === "not-configured" && (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="rounded-lg border border-line bg-charcoal-2 p-5">
              <p className="mb-1 text-sm font-medium text-paper">
                VALORANT integration is currently being configured.
              </p>
              <p className="text-sm text-smoke">
                {valorant.errorMessage ?? "Riot API credentials haven't been set up on this server yet."}
              </p>
            </div>
            <Link to="/" className="mt-5 inline-block text-sm font-medium text-paper underline underline-offset-2">
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* User denied access */}
        {valorant.status === "denied" && (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="rounded-lg border border-line bg-charcoal-2 p-5">
              <p className="mb-1 text-sm font-medium text-paper">Access not granted</p>
              <p className="text-sm text-smoke">
                {valorant.errorMessage ?? "You didn't authorize Roastify to read your VALORANT data."}
              </p>
            </div>
            <button
              type="button"
              onClick={valorant.connect}
              className="mt-5 text-sm font-medium text-paper underline underline-offset-2"
            >
              Try connecting again
            </button>
          </div>
        )}

        {/* Session expired */}
        {valorant.status === "session-expired" && (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="rounded-lg border border-verdict/40 bg-verdict/10 p-5">
              <p className="mb-1 text-sm font-medium text-verdict">Session expired</p>
              <p className="text-sm text-smoke">{valorant.errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={valorant.connect}
              className="mt-5 text-sm font-medium text-paper underline underline-offset-2"
            >
              Reconnect Riot Account
            </button>
          </div>
        )}

        {/* Generic error */}
        {valorant.status === "error" && (
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="rounded-lg border border-verdict/40 bg-verdict/10 p-5">
              <p className="mb-1 text-sm font-medium text-verdict">Something went wrong</p>
              <p className="text-sm text-smoke">{valorant.errorMessage ?? "An unexpected error occurred."}</p>
            </div>
            <button
              type="button"
              onClick={valorant.connect}
              className="mt-5 text-sm font-medium text-paper underline underline-offset-2"
            >
              Try connecting again
            </button>
          </div>
        )}

        {/* Done — full results */}
        {valorant.status === "done" && valorant.profile && valorant.roastText && (
          <div className="space-y-6">
            <ValorantProfile data={valorant.profile} />
            <ValorantStats data={valorant.profile} />

            <div className="grid gap-6 sm:grid-cols-2">
              <ValorantAgents data={valorant.profile} />
              <ValorantMaps data={valorant.profile} />
            </div>

            <ValorantMatchHistory data={valorant.profile} />

            <div className="border-t border-line pt-6">
              <ValorantRoastResult
                roastText={valorant.roastText}
                provider={valorant.provider}
                data={valorant.profile}
              />
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => valorant.regenerate()}
                className="rounded-md bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white"
              >
                Roast Me Again
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="rounded-md border border-line px-4 py-2 text-sm text-paper transition-colors hover:border-smoke-dim"
              >
                Share Roast
              </button>
              {!valorant.profile.isMock && (
                <a
                  href={`https://tracker.gg/valorant/profile/riot/${encodeURIComponent(valorant.profile.riotId.replace("#", "%23"))}/overview`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-line px-4 py-2 text-sm text-paper transition-colors hover:border-smoke-dim"
                >
                  View VALORANT Profile
                </a>
              )}
              <Link
                to="/"
                className="rounded-md border border-line px-4 py-2 text-sm text-paper transition-colors hover:border-smoke-dim"
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
