// services/movies.js
// Server-side Trakt.tv API access for the Movie Roast integration.
// Trakt's public endpoints (a user's watched history, ratings, and stats)
// only require an application Client ID — no user OAuth needed as long as
// the target user's Trakt profile/history is set to public. This mirrors
// the Steam integration: the API credential (TRAKT_CLIENT_ID) never leaves
// this module, and the frontend only ever talks to our backend.
//
// Data-source layer is intentionally isolated behind fetchNormalizedMovieData()
// so a future provider (TMDB account import, IMDb export, another Letterboxd-
// adjacent API, etc.) can be added without touching server.js or the AI prompt.

const axios = require('axios');

const TRAKT_API_BASE = 'https://api.trakt.tv';
const REQUEST_TIMEOUT = 15000;
const TRAKT_API_VERSION = '2';

function getClientId() {
    const key = process.env.TRAKT_CLIENT_ID;
    if (!key) throw new Error('TRAKT_CLIENT_ID is not set on the server.');
    return key;
}

function isConfigured() {
    return Boolean(process.env.TRAKT_CLIENT_ID);
}

function traktHeaders() {
    return {
        'Content-Type': 'application/json',
        'trakt-api-version': TRAKT_API_VERSION,
        'trakt-api-key': getClientId(),
    };
}

/**
 * Accepts a full profile URL (trakt.tv/users/username) or a bare username
 * and returns just the username/slug Trakt expects in its /users/:id routes.
 */
function parseProfileInput(rawInput) {
    const input = (rawInput || '').trim();
    if (!input) return null;

    try {
        const url = input.startsWith('http') ? new URL(input) : new URL(`https://${input}`);
        if (url.hostname.includes('trakt.tv')) {
            const segments = url.pathname.split('/').filter(Boolean);
            const usersIdx = segments.indexOf('users');
            if (usersIdx !== -1 && segments[usersIdx + 1]) {
                return segments[usersIdx + 1];
            }
        }
        // A bare word parses as a URL with an empty path and a "hostname" —
        // treat that hostname as the username itself (e.g. "example").
        if (!url.hostname.includes('.')) {
            return url.hostname;
        }
    } catch {
        // Not URL-shaped at all — treat the raw string as the username.
        return input.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
    }

    return input.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
}

class MovieProfilePrivateError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MovieProfilePrivateError';
        this.code = 'PROFILE_PRIVATE';
    }
}

class MovieProfileNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MovieProfileNotFoundError';
        this.code = 'PROFILE_NOT_FOUND';
    }
}

async function traktGet(path, params) {
    try {
        const response = await axios.get(`${TRAKT_API_BASE}${path}`, {
            headers: traktHeaders(),
            params,
            timeout: REQUEST_TIMEOUT,
        });
        return response.data;
    } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
            throw new MovieProfileNotFoundError(
                'Could not find that Trakt profile. Double-check the username and try again.'
            );
        }
        if (status === 403) {
            throw new MovieProfilePrivateError(
                "That Trakt profile's history is private, so Roastify can't access enough data to roast it."
            );
        }
        if (status === 429) {
            const err = new Error('Trakt API rate limit reached. Please try again in a few minutes.');
            err.code = 'RATE_LIMITED';
            throw err;
        }
        throw error;
    }
}

/** Basic public profile info — display name/username and slug. */
async function getUserProfile(username) {
    return traktGet(`/users/${encodeURIComponent(username)}`);
}

/**
 * Full watched-movies history with play counts and last-watched date.
 * This is the "movies watched" backbone — Trakt already dedupes/aggregates
 * per-movie play counts here, so we don't need the raw chronological
 * /history endpoint for basic taste analysis.
 */
async function getWatchedMovies(username) {
    return traktGet(`/users/${encodeURIComponent(username)}/watched/movies`, { extended: 'full' });
}

/** User's per-movie ratings (1-10 scale), where given. */
async function getRatedMovies(username) {
    return traktGet(`/users/${encodeURIComponent(username)}/ratings/movies`);
}

/** Recent chronological watch history (most recent first), capped. */
async function getRecentHistory(username, limit = 15) {
    return traktGet(`/users/${encodeURIComponent(username)}/history/movies`, { limit, page: 1 });
}

const CURRENT_YEAR = new Date().getFullYear();

function decadeOf(year) {
    if (!year || typeof year !== 'number') return undefined;
    return `${Math.floor(year / 10) * 10}s`;
}

/**
 * Normalizes raw Trakt API responses into the provider-independent
 * MovieRoastData shape the AI prompt and UI both consume. No fabricated
 * fields — anything Trakt doesn't give us (e.g. actors, runtime are
 * present on `extended=full` movie objects but per-user aggregates like
 * "favorite actor" are only included if we can actually compute them).
 */
function normalizeMovieData(username, watched, rated, recent) {
    const ratingByTraktId = new Map();
    for (const r of rated || []) {
        if (r?.movie?.ids?.trakt != null && typeof r.rating === 'number') {
            ratingByTraktId.set(r.movie.ids.trakt, r.rating);
        }
    }

    const genreCounts = {};
    const directorCounts = {}; // Not populated: Trakt's summary endpoints don't return crew data without extra per-movie calls.
    const decadeCounts = {};
    const ratingValues = [];
    let totalPlays = 0;

    const movies = (watched || [])
        .filter((entry) => entry?.movie)
        .map((entry) => {
            const m = entry.movie;
            const year = m.year || undefined;
            const genres = Array.isArray(m.genres) ? m.genres.map((g) => titleCase(g)) : [];
            const rating = ratingByTraktId.get(m.ids?.trakt);

            genres.forEach((g) => {
                genreCounts[g] = (genreCounts[g] || 0) + 1;
            });
            const decade = decadeOf(year);
            if (decade) decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
            if (typeof rating === 'number') ratingValues.push(rating);
            totalPlays += entry.plays || 1;

            return {
                title: m.title,
                year,
                rating,
                genres,
                plays: entry.plays || 1,
                lastWatchedAt: entry.last_watched_at || undefined,
                runtime: typeof m.runtime === 'number' ? m.runtime : undefined,
                overview: m.overview || undefined,
                traktId: m.ids?.trakt,
            };
        });

    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g]) => g);

    const favoriteDecades = Object.entries(decadeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([d]) => d);

    const averageRating =
        ratingValues.length > 0
            ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
            : undefined;

    const recentMovies = (recent || [])
        .filter((entry) => entry?.movie)
        .slice(0, 10)
        .map((entry) => entry.movie.title);

    const preNewCutoff = CURRENT_YEAR - 15;
    const oldMovieCount = movies.filter((m) => m.year && m.year < preNewCutoff).length;
    const newMovieCount = movies.filter((m) => m.year && m.year >= preNewCutoff).length;

    // Sort movies by rating (desc, unrated last) for the "favorites" cut,
    // and keep a plays-desc list for evidence about rewatches.
    const highlyRated = [...movies]
        .filter((m) => typeof m.rating === 'number')
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const mostRewatched = [...movies].sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];

    return {
        username,
        totalMovies: movies.length,
        movies,
        topGenres,
        topDirectors: [], // Not available without per-movie crew lookups; UI hides this section if empty.
        topActors: [], // Same as above.
        averageRating,
        favoriteDecades,
        recentMovies,
        // Pre-computed "evidence" figures — single source of truth so the
        // AI prompt and the displayed evidence card always agree.
        evidence: {
            totalPlays,
            genreDistribution: Object.fromEntries(
                Object.entries(genreCounts).map(([g, count]) => [
                    g,
                    movies.length ? Math.round((count / movies.length) * 100) : 0,
                ])
            ),
            topGenrePercent:
                topGenres.length && movies.length
                    ? Math.round((genreCounts[topGenres[0]] / movies.length) * 100)
                    : undefined,
            oldMoviePercent: movies.length ? Math.round((oldMovieCount / movies.length) * 100) : undefined,
            newMoviePercent: movies.length ? Math.round((newMovieCount / movies.length) * 100) : undefined,
            highRatingCount: ratingValues.filter((r) => r >= 8).length,
            highRatingPercent: ratingValues.length
                ? Math.round((ratingValues.filter((r) => r >= 8).length / ratingValues.length) * 100)
                : undefined,
            mostRewatched:
                mostRewatched && (mostRewatched.plays || 0) > 1
                    ? { title: mostRewatched.title, plays: mostRewatched.plays }
                    : undefined,
            topRated: highlyRated.slice(0, 5).map((m) => ({ title: m.title, rating: m.rating })),
        },
    };
}

function titleCase(str) {
    return String(str)
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/**
 * Full fetch: resolve username -> watched history + ratings + recent
 * activity -> normalize. Throws MovieProfilePrivateError /
 * MovieProfileNotFoundError for the caller to map to HTTP responses.
 */
async function fetchNormalizedMovieData(rawProfileInput) {
    const username = parseProfileInput(rawProfileInput);
    if (!username) {
        throw new Error(
            'Could not understand that Trakt profile. Enter a Trakt username or a profile URL (trakt.tv/users/yourname).'
        );
    }

    // Confirms the profile exists before we fan out into history/ratings —
    // gives a cleaner "not found" vs "private" distinction.
    await getUserProfile(username);

    const [watched, rated, recent] = await Promise.all([
        getWatchedMovies(username),
        getRatedMovies(username).catch(() => []), // ratings are optional; don't fail the whole flow if unavailable
        getRecentHistory(username).catch(() => []),
    ]);

    if (!Array.isArray(watched) || watched.length === 0) {
        const err = new Error(
            "This Trakt profile doesn't have any watched movies on record, so there's nothing to roast yet."
        );
        err.code = 'EMPTY_HISTORY';
        throw err;
    }

    return normalizeMovieData(username, watched, rated, recent);
}

module.exports = {
    isConfigured,
    parseProfileInput,
    fetchNormalizedMovieData,
    normalizeMovieData,
    MovieProfilePrivateError,
    MovieProfileNotFoundError,
};
