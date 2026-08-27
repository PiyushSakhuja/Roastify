import type { GitHubRoastData } from "../../types/github";

interface GitHubStatsProps {
  profile: GitHubRoastData;
}

export function GitHubStats({ profile }: GitHubStatsProps) {
  const topRepos = [...profile.repositories]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 5);

  return (
    <div className="border border-line rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-paper uppercase tracking-wide">
          Repository Activity
        </h3>
        <div className="flex items-center gap-4 text-xs text-smoke-dim font-mono">
          <span>{profile.evidence.totalStars} ★ total</span>
          <span>{profile.evidence.totalForks} forks</span>
        </div>
      </div>

      {topRepos.length === 0 ? (
        <p className="text-sm text-smoke-dim">No public repositories found.</p>
      ) : (
        <ul className="space-y-2.5">
          {topRepos.map((repo) => (
            <li
              key={repo.name}
              className="flex items-start justify-between gap-3 text-sm border-b border-line/60 last:border-0 pb-2.5 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-paper font-medium truncate">{repo.name}</p>
                {repo.description && (
                  <p className="text-smoke-dim text-xs truncate mt-0.5">
                    {repo.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2 text-xs text-smoke-dim font-mono">
                {repo.language && <span>{repo.language}</span>}
                <span>{repo.stars} ★</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
