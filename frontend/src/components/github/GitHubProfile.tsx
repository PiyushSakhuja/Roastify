import type { GitHubRoastData } from "../../types/github";

interface GitHubProfileProps {
  profile: GitHubRoastData;
}

function formatAccountAge(days?: number): string {
  if (!days) return "Unknown";
  const years = Math.floor(days / 365);
  if (years >= 1) return `${years} yr${years === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  return `${months} mo${months === 1 ? "" : "s"}`;
}

export function GitHubProfile({ profile }: GitHubProfileProps) {
  const stats = [
    { label: "Repositories", value: profile.publicRepos },
    { label: "Followers", value: profile.followers },
    { label: "Following", value: profile.following },
    { label: "Account age", value: formatAccountAge(profile.accountAgeDays) },
  ];

  return (
    <div className="border border-line rounded-lg p-5">
      <div className="flex items-start gap-4">
        {profile.avatarUrl && (
          <img
            src={profile.avatarUrl}
            alt={`${profile.username}'s GitHub avatar`}
            className="h-14 w-14 rounded-full border border-line"
          />
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-paper truncate">
            {profile.name || profile.username}
          </p>
          <p className="text-sm text-smoke font-mono">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-1.5 text-sm text-smoke-dim leading-relaxed">{profile.bio}</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-line">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xl font-semibold text-paper">{stat.value}</p>
            <p className="text-xs text-smoke-dim uppercase tracking-wide mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
