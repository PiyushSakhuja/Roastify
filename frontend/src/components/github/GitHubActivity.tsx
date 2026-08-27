import type { GitHubActivityEntry } from "../../types/github";

interface GitHubActivityProps {
  recentActivity: GitHubActivityEntry[];
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

export function GitHubActivity({ recentActivity }: GitHubActivityProps) {
  return (
    <div className="border border-line rounded-lg p-5">
      <h3 className="text-sm font-semibold text-paper uppercase tracking-wide mb-4">
        Recent Activity
      </h3>
      {recentActivity.length === 0 ? (
        <p className="text-sm text-smoke-dim">No recent public activity found.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {recentActivity.map((entry, i) => (
            <li key={`${entry.repo}-${i}`} className="flex items-center justify-between gap-3">
              <span className="text-smoke">
                <span className="text-paper">{entry.type}</span> on{" "}
                <span className="font-mono text-xs text-smoke-dim">{entry.repo}</span>
              </span>
              <span className="shrink-0 text-xs text-smoke-dim font-mono">
                {formatRelativeTime(entry.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
