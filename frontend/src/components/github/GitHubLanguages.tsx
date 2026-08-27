import type { GitHubRepository } from "../../types/github";

interface GitHubLanguagesProps {
  topLanguages: string[];
  repositories: GitHubRepository[];
}

/**
 * Computes real percentage-of-repos per language from the actual repo list
 * — never a placeholder or estimated bar. If a language can't be counted
 * (e.g. no repos have a detected language), it's simply omitted.
 */
function computeLanguageBreakdown(
  topLanguages: string[],
  repositories: GitHubRepository[]
): Array<{ language: string; percent: number; count: number }> {
  const languaged = repositories.filter((r) => r.language);
  if (languaged.length === 0) return [];

  return topLanguages
    .map((language) => {
      const count = languaged.filter((r) => r.language === language).length;
      return { language, count, percent: Math.round((count / languaged.length) * 100) };
    })
    .filter((entry) => entry.count > 0);
}

export function GitHubLanguages({ topLanguages, repositories }: GitHubLanguagesProps) {
  const breakdown = computeLanguageBreakdown(topLanguages, repositories);

  if (breakdown.length === 0) {
    return (
      <div className="border border-line rounded-lg p-5">
        <h3 className="text-sm font-semibold text-paper uppercase tracking-wide mb-3">
          Top Languages
        </h3>
        <p className="text-sm text-smoke-dim">No language data available.</p>
      </div>
    );
  }

  return (
    <div className="border border-line rounded-lg p-5">
      <h3 className="text-sm font-semibold text-paper uppercase tracking-wide mb-4">
        Top Languages
      </h3>
      <div className="space-y-3">
        {breakdown.map((entry) => (
          <div key={entry.language}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-paper font-medium">{entry.language}</span>
              <span className="text-smoke-dim font-mono text-xs">
                {entry.percent}% &middot; {entry.count} repo{entry.count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-github)]"
                style={{ width: `${entry.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
