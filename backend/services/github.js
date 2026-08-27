// integrations/github.js
// Server-side GitHub OAuth + data fetching. Mirrors the pattern already
// used for Spotify in server.js: secrets never leave the backend, all
// third-party API calls happen here, and only normalized/summarized data
// is handed off to the AI provider layer.

const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * Exchanges a GitHub OAuth authorization code for an access token.
 * Requires GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET server-side — never
 * sent to or accepted from the frontend.
 */
async function exchangeCodeForToken(code, redirectUri) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    const response = await axios.post(
        GITHUB_TOKEN_URL,
        {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        },
        {
            headers: { Accept: 'application/json' },
            timeout: 15000,
        }
    );

    if (response.data?.error) {
        throw new Error(response.data.error_description || response.data.error);
    }
    if (!response.data?.access_token) {
        throw new Error('GitHub did not return an access token.');
    }
    return response.data.access_token;
}

function githubHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Roastify-App',
    };
}

/** Fetches the authenticated user's public profile. */
async function fetchProfile(token) {
    const response = await axios.get(`${GITHUB_API_BASE}/user`, {
        headers: githubHeaders(token),
        timeout: 15000,
    });
    return response.data;
}

/**
 * Fetches up to 100 of the user's public repositories, most-recently
 * updated first — enough to spot patterns without pulling their entire
 * account history.
 */
async function fetchRepositories(token) {
    const response = await axios.get(`${GITHUB_API_BASE}/user/repos`, {
        headers: githubHeaders(token),
        params: {
            per_page: 100,
            sort: 'updated',
            direction: 'desc',
            affiliation: 'owner',
        },
        timeout: 15000,
    });
    return response.data;
}

/**
 * Fetches the user's recent public events (commits, PRs opened, repos
 * created, etc). This endpoint is public-events only — no private activity
 * is ever requested or returned.
 */
async function fetchRecentActivity(username, token) {
    try {
        const response = await axios.get(`${GITHUB_API_BASE}/users/${username}/events/public`, {
            headers: githubHeaders(token),
            params: { per_page: 30 },
            timeout: 15000,
        });
        return response.data;
    } catch (error) {
        // Activity is a nice-to-have for the roast, not essential — degrade
        // gracefully rather than failing the whole flow if this 404s/errors.
        return [];
    }
}

const EVENT_TYPE_LABELS = {
    PushEvent: 'pushed commits',
    PullRequestEvent: 'opened a PR',
    CreateEvent: 'created a repo/branch',
    IssuesEvent: 'opened/updated an issue',
    ForkEvent: 'forked a repo',
    WatchEvent: 'starred a repo',
    ReleaseEvent: 'published a release',
    DeleteEvent: 'deleted a branch',
};

/**
 * Turns raw GitHub API responses into a small, normalized object safe to
 * send to an AI provider — no huge raw payloads, no private data, just the
 * facts a roast can be built from.
 */
function normalizeGitHubData(profile, repos, activity) {
    const accountAgeDays = profile.created_at
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

    const languageCounts = {};
    let totalStars = 0;
    let totalForks = 0;
    const now = Date.now();
    let staleRepoCount = 0; // not updated in 2+ years

    const repositories = (repos || []).map((r) => {
        if (r.language) {
            languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
        }
        totalStars += r.stargazers_count || 0;
        totalForks += r.forks_count || 0;
        let isStale = false;
        if (r.pushed_at) {
            const ageDays = (now - new Date(r.pushed_at).getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays > 730) {
                staleRepoCount += 1;
                isStale = true;
            }
        }
        return {
            name: r.name,
            description: r.description || undefined,
            language: r.language || undefined,
            stars: r.stargazers_count || 0,
            forks: r.forks_count || 0,
            updatedAt: r.pushed_at || r.updated_at || undefined,
            isFork: Boolean(r.fork),
            isStale,
        };
    });

    const topLanguages = Object.entries(languageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang]) => lang);

    const recentActivity = (activity || [])
        .filter((e) => EVENT_TYPE_LABELS[e.type])
        .slice(0, 10)
        .map((e) => ({
            type: EVENT_TYPE_LABELS[e.type],
            repo: e.repo?.name || 'unknown repo',
            createdAt: e.created_at,
        }));

    return {
        username: profile.login,
        name: profile.name || undefined,
        bio: profile.bio || undefined,
        avatarUrl: profile.avatar_url,
        publicRepos: profile.public_repos ?? repositories.length,
        followers: profile.followers ?? 0,
        following: profile.following ?? 0,
        accountAgeDays,
        topLanguages,
        repositories,
        recentActivity,
        // Pre-computed "evidence" figures the frontend can display directly
        // without re-deriving them (and so the AI prompt and the displayed
        // evidence are guaranteed to match — same numbers, one source).
        evidence: {
            totalStars,
            totalForks,
            staleRepoCount,
            topLanguagePercent:
                repositories.length && topLanguages[0]
                    ? Math.round((languageCounts[topLanguages[0]] / repositories.length) * 100)
                    : undefined,
        },
    };
}

module.exports = {
    exchangeCodeForToken,
    fetchProfile,
    fetchRepositories,
    fetchRecentActivity,
    normalizeGitHubData,
};
