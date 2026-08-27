import type { GitHubRoastData } from "../../types/github";

interface GitHubRoastResultProps {
  roastText: string;
  provider?: string | null;
  profile: GitHubRoastData;
}

/**
 * Builds the "evidence" list entirely from real, already-computed values on
 * the normalized profile — never a placeholder or invented statistic. Each
 * line only appears if the underlying number is meaningful (e.g. we don't
 * show "0 repositories with no recent activity" as if it were a burn).
 */
function buildEvidence(profile: GitHubRoastData): string[] {
  const lines: string[] = [];
  const { evidence, publicRepos, followers, following, topLanguages } = profile;

  lines.push(`${publicRepos} public repositor${publicRepos === 1 ? "y" : "ies"}`);

  if (evidence.topLanguagePercent && topLanguages[0]) {
    lines.push(`${evidence.topLanguagePercent}% ${topLanguages[0]}`);
  }

  if (evidence.staleRepoCount > 0) {
    lines.push(
      `${evidence.staleRepoCount} repositor${evidence.staleRepoCount === 1 ? "y" : "ies"} untouched for 2+ years`
    );
  }

  lines.push(`${evidence.totalStars} star${evidence.totalStars === 1 ? "" : "s"} received`);

  if (following > followers * 3 && following > 20) {
    lines.push(`Following ${following} people, followed back by ${followers}`);
  }

  if (evidence.totalForks > 0) {
    lines.push(`${evidence.totalForks} fork${evidence.totalForks === 1 ? "" : "s"} across all repos`);
  }

  return lines;
}

export function GitHubRoastResult({ roastText, provider, profile }: GitHubRoastResultProps) {
  const evidence = buildEvidence(profile);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
          The Verdict
        </h2>
        {provider && (
          <span className="text-xs text-smoke-dim font-mono uppercase tracking-wide">
            {provider}
          </span>
        )}
      </div>

      <p className="text-lg leading-relaxed text-paper border-l-2 border-[var(--color-github)] pl-4 py-1 mb-6">
        {roastText}
      </p>

      <div className="border border-line rounded-lg p-4">
        <h3 className="text-xs font-semibold text-smoke-dim uppercase tracking-wide mb-3">
          Evidence used against you
        </h3>
        <ul className="space-y-1.5">
          {evidence.map((line) => (
            <li key={line} className="text-sm text-smoke flex items-start gap-2">
              <span className="text-[var(--color-github)] mt-1.5 h-1 w-1 rounded-full bg-current shrink-0" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
