// Types for the normalized GitHub profile the backend returns from
// POST /api/github/roast. Mirrors integrations/github.js#normalizeGitHubData
// on the backend — keep these in sync if that shape changes.

export interface GitHubRepository {
  name: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  updatedAt?: string;
  isFork: boolean;
  isStale: boolean;
}

export interface GitHubActivityEntry {
  type: string;
  repo: string;
  createdAt: string;
}

export interface GitHubEvidence {
  totalStars: number;
  totalForks: number;
  staleRepoCount: number;
  topLanguagePercent?: number;
}

export interface GitHubRoastData {
  username: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  publicRepos: number;
  followers: number;
  following: number;
  accountAgeDays?: number;
  topLanguages: string[];
  repositories: GitHubRepository[];
  recentActivity: GitHubActivityEntry[];
  evidence: GitHubEvidence;
}
