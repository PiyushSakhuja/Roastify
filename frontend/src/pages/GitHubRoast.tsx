import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGitHubRoast } from "../hooks/useGitHubRoast";
import { GitHubIcon } from "../components/icons";
import { GitHubProfile } from "../components/github/GitHubProfile";
import { GitHubLanguages } from "../components/github/GitHubLanguages";
import { GitHubStats } from "../components/github/GitHubStats";
import { GitHubActivity } from "../components/github/GitHubActivity";
import { GitHubRoastResult } from "../components/github/GitHubRoastResult";

const LOADING_MESSAGES = [
  "Analyzing your repositories...",
  "Checking how many projects you abandoned...",
  "Reviewing your questionable technology choices...",
  "Counting your 'will finish later' repos...",
  "Finding evidence...",
];

function useRotatingMessage(active: boolean, messages: string[], intervalMs = 1800) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, messages, intervalMs]);

  return messages[index];
}

export function GitHubRoastPage() {
  const github = useGitHubRoast();
  const isLoading =
    github.status === "authenticating" || github.status === "generating-roast";
  const loadingMessage = useRotatingMessage(isLoading, LOADING_MESSAGES);
  const showResults = github.status !== "idle";

  return (
    <div className="min-h-screen bg-ink">
      <div className="grain" />

      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-smoke hover:text-paper transition-colors"
          >
            &larr; Back to Roastify
          </Link>

          <div className="flex items-center gap-2 text-sm text-paper">
            <GitHubIcon className="h-5 w-5 text-[var(--color-github)]" />
            <span className="font-medium">GitHub Roast</span>
          </div>

          <div className="text-xs font-mono uppercase tracking-wide">
            {github.status === "done" ? (
              <span className="flex items-center gap-1.5 text-[var(--color-acid)]">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Connected
              </span>
            ) : (
              <span className="text-smoke-dim">Not connected</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {!showResults && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="h-12 w-12 mx-auto mb-5 flex items-center justify-center rounded-lg border border-line text-[var(--color-github)]">
              <GitHubIcon className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl uppercase tracking-wide text-paper mb-2">
              Connect GitHub
            </h1>
            <p className="text-sm text-smoke mb-8 leading-relaxed">
              We'll look at your public repositories, languages, and activity —
              then hand it to an AI that isn't going to be nice about it.
            </p>
            <button
              type="button"
              onClick={github.connect}
              className="inline-flex items-center gap-2 rounded-md bg-paper text-ink px-5 py-2.5 text-sm font-semibold hover:bg-white transition-colors"
            >
              <GitHubIcon className="h-4 w-4" />
              Connect GitHub
            </button>
            <p className="mt-4 text-xs text-smoke-dim">
              Read-only access. We never touch your code or private repos.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="h-8 w-8 mx-auto mb-5 rounded-full border-2 border-line border-t-[var(--color-github)] animate-spin" />
            <p className="text-sm text-smoke font-mono">{loadingMessage}</p>
          </div>
        )}

        {github.status === "done" && github.profile && github.roastText && (
          <div className="space-y-6">
            <GitHubProfile profile={github.profile} />

            <div className="grid gap-6 sm:grid-cols-2">
              <GitHubLanguages
                topLanguages={github.profile.topLanguages}
                repositories={github.profile.repositories}
              />
              <GitHubActivity recentActivity={github.profile.recentActivity} />
            </div>

            <GitHubStats profile={github.profile} />

            <div className="border-t border-line pt-6">
              <GitHubRoastResult
                roastText={github.roastText}
                provider={github.provider}
                profile={github.profile}
              />
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => github.regenerate()}
                className="rounded-md bg-paper text-ink px-4 py-2 text-sm font-semibold hover:bg-white transition-colors"
              >
                Roast Me Again
              </button>
              <a
                href={`https://github.com/${github.profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line px-4 py-2 text-sm text-paper hover:border-smoke-dim transition-colors"
              >
                View GitHub
              </a>
              <button
                type="button"
                onClick={() => {
                  const shareText = `I got roasted on Roastify: "${github.roastText}"`;
                  if (navigator.share) {
                    navigator.share({ text: shareText }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(shareText).catch(() => {});
                  }
                }}
                className="rounded-md border border-line px-4 py-2 text-sm text-paper hover:border-smoke-dim transition-colors"
              >
                Share Roast
              </button>
              <Link
                to="/"
                className="rounded-md border border-line px-4 py-2 text-sm text-paper hover:border-smoke-dim transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {github.status === "error" && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="border border-verdict/40 bg-verdict/10 rounded-lg p-5">
              <p className="text-sm font-medium text-verdict mb-1">
                Something went wrong
              </p>
              <p className="text-sm text-smoke">
                {github.errorMessage ?? "An unexpected error occurred."}
              </p>
            </div>
            <button
              type="button"
              onClick={github.connect}
              className="mt-5 text-sm font-medium text-paper underline underline-offset-2"
            >
              Try connecting again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
