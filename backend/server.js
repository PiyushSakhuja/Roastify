// server.js - Secure backend for Spotify Token Exchange + Multi-Provider AI Roast Generation
// Requires: express, axios, cors, dotenv, express-rate-limit

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const aiProviders = require('./providers');
const steamPrompt = require('./providers/steamPrompt');
const steamService = require('./services/steam');
const github = require('./services/github');
const movies = require('./services/movies');
const valorant = require('./services/valorant');
const app = express();
const PORT = process.env.PORT || 8888;

// --- Load Spotify credentials from environment ---
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('FATAL: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set (see .env.example).');
    process.exit(1);
}

// Steam is an optional integration — warn instead of exiting so the rest of
// Roastify (Spotify, and any other platform) keeps working without it.
if (!steamService.isConfigured()) {
    console.warn('WARNING: STEAM_API_KEY is not set. Steam Roast endpoints will return an error until configured.');
}
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const githubConfigured = Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);
if (!githubConfigured) {
    console.warn('GitHub roasting disabled: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable it (see .env.example).');
}
// Movies is an optional integration too — warn instead of exiting.
if (!movies.isConfigured()) {
    console.warn('WARNING: TRAKT_CLIENT_ID is not set. Movie Roast endpoints will return an error until configured.');
}
// VALORANT: never silently falls back to mock — if VALORANT_PROVIDER=riot
// (the default) and Riot credentials are missing, the integration reports
// itself as "being configured" rather than serving fake data.
const valorantProviderInfo = valorant.getActiveProviderInfo();
if (valorantProviderInfo.provider === 'mock') {
    console.warn('VALORANT Roast is running in MOCK mode (VALORANT_PROVIDER=mock). This is for development/UI testing only — never real player data.');
} else if (!valorantProviderInfo.configured) {
    const uri = process.env.RIOT_RSO_REDIRECT_URI;
    if (uri && valorant.isPlaceholderRedirectUri(uri)) {
        console.warn(
            `VALORANT Roast disabled: RIOT_RSO_REDIRECT_URI is still set to the placeholder value from .env.example (${uri}). Replace it with your real deployed backend URL, e.g. https://your-actual-backend.com/api/valorant/callback.`
        );
    } else {
        console.warn('VALORANT Roast disabled: set RIOT_RSO_CLIENT_ID, RIOT_RSO_CLIENT_SECRET, RIOT_API_KEY, and RIOT_RSO_REDIRECT_URI to enable it (see .env.example).');
    }
}
// At least one AI provider must be configured, but which one is flexible.
const configuredProviders = aiProviders.getConfiguredProviders();
if (configuredProviders.length === 0) {
    console.error(
        'FATAL: No AI providers configured. Set at least one of GROQ_API_KEY, MISTRAL_API_KEY, or GEMINI_API_KEY (see .env.example).'
    );
    process.exit(1);
}
console.log(`AI providers available: ${configuredProviders.map((p) => p.label).join(', ')}`);

// --- CORS configuration ---
// ALLOWED_ORIGINS should be a comma-separated list, e.g.
// "https://your-frontend.com,http://localhost:8888"
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8888')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser tools (curl, health checks) with no Origin header
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
};

// --- Middleware ---
// Behind a platform proxy (Render/Railway/Fly/etc), Express needs this to
// read the real client IP from X-Forwarded-For — otherwise the rate limiter
// below sees the proxy's IP for every request and either rate-limits everyone
// together or nobody at all.
app.set('trust proxy', 1);

// Security headers. CSP is left in report-only-friendly defaults here since
// this API serves JSON, not HTML, to third-party origins — tighten further
// if you add server-rendered pages.
app.use(helmet());

app.use(cors(corsOptions));
app.use(express.json());

// Rate limit the expensive/paid endpoints so a stray script or abuser
// can't run up API usage against any provider's free tier.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', apiLimiter);

// --- Endpoint for Token Exchange (the secure part) ---
app.post('/api/token-exchange', async (req, res) => {
    const { code, redirect_uri } = req.body || {};

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid authorization code.' });
    }
    if (!redirect_uri || typeof redirect_uri !== 'string') {
        return res.status(400).json({ error: 'Missing redirect_uri in request body.' });
    }

    try {
        const tokenUrl = 'https://accounts.spotify.com/api/token';
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        const response = await axios({
            method: 'post',
            url: tokenUrl,
            data: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri,
            }).toString(),
            headers: {
                Authorization: `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        // Spotify response contains access_token, refresh_token, expires_in, etc.
        res.json(response.data);
    } catch (error) {
        console.error('Error during token exchange:', error.response ? error.response.data : error.message);
        res.status(502).json({
            error: 'Failed to exchange authorization code for access token.',
            details: error.response?.data?.error_description || error.message,
        });
    }
});

// --- Endpoint to list which AI agents/providers are available ---
// Lets the frontend show a picker without hardcoding provider knowledge.
app.get('/api/providers', (req, res) => {
    res.json({ providers: aiProviders.listProvidersStatus() });
});

// --- Endpoint for AI roast generation ---
// Accepts an optional `provider` field to pick a specific AI agent
// (e.g. "groq", "mistral", "gemini"). If omitted, falls back through
// all configured providers in order until one succeeds.
app.post('/api/generate-roast', async (req, res) => {
    const { topArtists, topTracks, topGenres, provider } = req.body || {};

    // Validate shape before building a prompt out of it
    const isValidList = (v) => Array.isArray(v) && v.every((item) => typeof item === 'string');
    if (!isValidList(topArtists) || !isValidList(topTracks) || !isValidList(topGenres)) {
        return res.status(400).json({
            error: 'Invalid request body. Expected topArtists, topTracks, and topGenres as arrays of strings.',
        });
    }
    if (provider !== undefined && typeof provider !== 'string') {
        return res.status(400).json({ error: 'provider must be a string if provided.' });
    }

    try {
        const { roastText, provider: usedProvider } = await aiProviders.generateRoast(
            { topArtists, topTracks, topGenres },
            provider || null
        );
        res.json({ roastText, provider: usedProvider });
    } catch (error) {
        console.error('Error generating roast:', error.message);
        res.status(502).json({
            error: 'Failed to generate roast.',
            details: error.message,
        });
    }
});

// --- Steam Roast endpoints ---
// All Steam Web API calls happen server-side; STEAM_API_KEY never reaches
// the client. Reuses the same apiLimiter as every other /api/* route.

function requireSteamProfileInput(req, res) {
    const { profile } = req.body || {};
    if (!profile || typeof profile !== 'string') {
        res.status(400).json({ error: 'Missing or invalid "profile". Provide a Steam profile URL, vanity name, or SteamID64.' });
        return null;
    }
    return profile;
}

function handleSteamError(res, error) {
    if (error.code === 'PROFILE_PRIVATE' || error.code === 'GAME_DETAILS_PRIVATE') {
        return res.status(403).json({ error: error.message, code: error.code });
    }
    console.error('Steam API error:', error.message);
    return res.status(502).json({ error: 'Failed to fetch Steam data.', details: error.message });
}

// GET-style lookup via query param, matching the "profile" -> "games" ->
// "roast" pipeline described for the feature; profile + games are combined
// into one normalized fetch since GetOwnedGames requires the same
// visibility check as GetPlayerSummaries anyway.
app.get('/api/steam/profile', async (req, res) => {
    const profile = typeof req.query.profile === 'string' ? req.query.profile : null;
    if (!profile) {
        return res.status(400).json({ error: 'Missing "profile" query parameter.' });
    }
    if (!steamService.isConfigured()) {
        return res.status(503).json({ error: 'Steam integration is not configured on this server.' });
    }

    try {
        const steamId = await steamService.resolveToSteamId(profile);
        const player = await steamService.getPlayerSummary(steamId);
        if (!steamService.isProfilePubliclyVisible(player)) {
            return res.status(403).json({
                error: "Your Steam game details are private, so Roastify can't access enough data to roast you properly.",
                code: 'PROFILE_PRIVATE',
            });
        }
        res.json({
            steamId,
            username: player.personaname,
            avatar: player.avatarfull || player.avatarmedium || player.avatar,
            profileUrl: player.profileurl,
        });
    } catch (error) {
        handleSteamError(res, error);
    }
});

app.get('/api/steam/games', async (req, res) => {
    const profile = typeof req.query.profile === 'string' ? req.query.profile : null;
    if (!profile) {
        return res.status(400).json({ error: 'Missing "profile" query parameter.' });
    }
    if (!steamService.isConfigured()) {
        return res.status(503).json({ error: 'Steam integration is not configured on this server.' });
    }

    try {
        const steamId = await steamService.resolveToSteamId(profile);
        const data = await steamService.fetchNormalizedSteamData(steamId);
        res.json(data);
    } catch (error) {
        handleSteamError(res, error);
    }
});

// Accepts either a raw "profile" (fetches fresh) or an already-normalized
// "steamData" (reuses cached data — powers "Roast Me Again" without
// re-hitting the Steam API for the whole library every time).
app.post('/api/steam/roast', async (req, res) => {
    const { profile, steamData, provider, intensity } = req.body || {};

    if (provider !== undefined && typeof provider !== 'string') {
        return res.status(400).json({ error: 'provider must be a string if provided.' });
    }
    if (intensity !== undefined && !aiProviders.isValidIntensity(intensity)) {
        return res.status(400).json({
            error: `intensity must be one of: ${aiProviders.INTENSITY_LEVELS.join(', ')}`,
        });
    }

    if (!steamService.isConfigured()) {
        return res.status(503).json({ error: 'Steam integration is not configured on this server.' });
    }

    try {
        let data = steamData;
        if (!data) {
            const profileInput = requireSteamProfileInput(req, res);
            if (!profileInput) return;
            const steamId = await steamService.resolveToSteamId(profileInput);
            data = await steamService.fetchNormalizedSteamData(steamId);
        }

        const isValidGameList = (v) =>
            Array.isArray(v) && v.every((g) => g && typeof g.name === 'string' && typeof g.playtimeHours === 'number');
        if (
            typeof data?.username !== 'string' ||
            typeof data?.totalGames !== 'number' ||
            typeof data?.totalPlaytimeHours !== 'number' ||
            !isValidGameList(data?.topGames) ||
            !isValidGameList(data?.recentlyPlayed || [])
        ) {
            return res.status(400).json({ error: 'Invalid or incomplete Steam data provided.' });
        }

        const systemPrompt = aiProviders.applyIntensity(steamPrompt.SYSTEM_PROMPT, intensity);
        const userPrompt = steamPrompt.buildUserPrompt(data);

        const { roastText, provider: usedProvider } = await aiProviders.generateRoastFromPrompt(
            systemPrompt,
            userPrompt,
            provider || null
        );

        res.json({ roastText, provider: usedProvider, steamData: data });
    } catch (error) {
        if (error.code === 'PROFILE_PRIVATE' || error.code === 'GAME_DETAILS_PRIVATE') {
            return handleSteamError(res, error);
        }
        console.error('Error generating Steam roast:', error.message);
        res.status(502).json({ error: 'Failed to generate roast.', details: error.message });
    }
});


function requireGitHubConfigured(req, res, next) {
    if (!githubConfigured) {
        return res.status(503).json({
            error: 'GitHub roasting is not configured on this server.',
            details: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable it.',
        });
    }
    next();
}




// In-memory cache of already-fetched GitHub data, keyed by access token,
// so "Roast Me Again" can regenerate without re-hitting GitHub's API or
// asking the user to log in again. Entries expire after 30 minutes.
const githubDataCache = new Map();
const GITHUB_CACHE_TTL_MS = 30 * 60 * 1000;

function cacheGitHubData(token, data) {
    githubDataCache.set(token, { data, expiresAt: Date.now() + GITHUB_CACHE_TTL_MS });
}

function getCachedGitHubData(token) {
    const entry = githubDataCache.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        githubDataCache.delete(token);
        return null;
    }
    return entry.data;
}

// Periodically sweep expired cache entries so this doesn't grow unbounded.
setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of githubDataCache.entries()) {
        if (now > entry.expiresAt) githubDataCache.delete(token);
    }
}, 10 * 60 * 1000).unref();

// --- Endpoint for GitHub OAuth token exchange ---
app.post('/api/github/token-exchange', requireGitHubConfigured, async (req, res) => {
    const { code, redirect_uri } = req.body || {};

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid authorization code.' });
    }
    if (!redirect_uri || typeof redirect_uri !== 'string') {
        return res.status(400).json({ error: 'Missing redirect_uri in request body.' });
    }

    try {
        const accessToken = await github.exchangeCodeForToken(code, redirect_uri);
        // The frontend needs a handle to reference cached data by without
        // ever seeing the real GitHub token, so we hand back an opaque
        // session id instead of the token itself.
        const sessionId = `gh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        githubDataCache.set(sessionId, { token: accessToken, expiresAt: Date.now() + GITHUB_CACHE_TTL_MS });
        res.json({ sessionId });
    } catch (error) {
        console.error('Error during GitHub token exchange:', error.response ? error.response.data : error.message);
        res.status(502).json({
            error: 'Failed to exchange authorization code for a GitHub access token.',
            details: error.response?.data?.error_description || error.message,
        });
    }
});

function getGitHubTokenForSession(sessionId) {
    const entry = githubDataCache.get(sessionId);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.token;
}

// --- Endpoint to fetch the connected user's normalized GitHub profile ---
app.get('/api/github/profile', requireGitHubConfigured, async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId query parameter.' });
    }

    const token = getGitHubTokenForSession(sessionId);
    if (!token) {
        return res.status(401).json({ error: 'GitHub session expired or invalid. Please reconnect.' });
    }

    try {
        const profile = await github.fetchProfile(token);
        res.json(profile);
    } catch (error) {
        handleGitHubApiError(res, error, 'Failed to fetch GitHub profile.');
    }
});

// --- Endpoint to fetch the connected user's repositories ---
app.get('/api/github/repos', requireGitHubConfigured, async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId query parameter.' });
    }

    const token = getGitHubTokenForSession(sessionId);
    if (!token) {
        return res.status(401).json({ error: 'GitHub session expired or invalid. Please reconnect.' });
    }

    try {
        const repos = await github.fetchRepositories(token);
        res.json(repos);
    } catch (error) {
        handleGitHubApiError(res, error, 'Failed to fetch GitHub repositories.');
    }
});

// --- Endpoint: full flow — fetch profile+repos+activity, normalize, roast ---
// This is the one the frontend actually calls after token-exchange; the
// /profile and /repos endpoints above exist per the requested route shape
// and for any future incremental-loading UI, but /roast is the common path.
app.post('/api/github/roast', requireGitHubConfigured, async (req, res) => {
    const { sessionId, provider, intensity } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId in request body.' });
    }
    if (provider !== undefined && typeof provider !== 'string') {
        return res.status(400).json({ error: 'provider must be a string if provided.' });
    }
    if (intensity !== undefined && !aiProviders.isValidIntensity(intensity)) {
        return res.status(400).json({
            error: `intensity must be one of: ${aiProviders.INTENSITY_LEVELS.join(', ')}`,
        });
    }

    const token = getGitHubTokenForSession(sessionId);
    if (!token) {
        return res.status(401).json({ error: 'GitHub session expired or invalid. Please reconnect.' });
    }

    try {
        // Reuse already-fetched+normalized data if this is a "Roast Me
        // Again" request, so we don't re-hit GitHub's API unnecessarily.
        let normalized = getCachedGitHubData(`normalized_${sessionId}`);
        if (!normalized) {
            const profile = await github.fetchProfile(token);
            const [repos, activity] = await Promise.all([
                github.fetchRepositories(token),
                github.fetchRecentActivity(profile.login, token),
            ]);
            normalized = github.normalizeGitHubData(profile, repos, activity);
            cacheGitHubData(`normalized_${sessionId}`, normalized);
        }

        const { roastText, provider: usedProvider } = await aiProviders.generateRoast(
            normalized,
            provider || null,
            'github',
            intensity
        );

        res.json({ roastText, provider: usedProvider, profile: normalized });
    } catch (error) {
        handleGitHubApiError(res, error, 'Failed to generate GitHub roast.');
    }
});

function handleGitHubApiError(res, error, fallbackMessage) {
    const status = error.response?.status;
    console.error(fallbackMessage, error.response ? error.response.data : error.message);

    if (status === 401) {
        return res.status(401).json({ error: 'GitHub session expired or was revoked. Please reconnect.' });
    }
    if (status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
        return res.status(429).json({
            error: 'GitHub API rate limit reached. Please try again in a few minutes.',
        });
    }
    if (status === 404) {
        return res.status(404).json({ error: 'GitHub profile data not found.' });
    }

    res.status(502).json({
        error: fallbackMessage,
        details: error.response?.data?.message || error.message,
    });
}

// --- Movie Roast endpoints ---
// All Trakt API calls happen server-side; TRAKT_CLIENT_ID never reaches the
// client. Mirrors the Steam integration: no OAuth, just a public profile
// identifier, with the same apiLimiter as every other /api/* route.

// In-memory cache of already-fetched+normalized movie data, keyed by
// username, so "Roast Me Again" doesn't re-hit Trakt's API for the whole
// watch history every time. Entries expire after 30 minutes.
const movieDataCache = new Map();
const MOVIE_CACHE_TTL_MS = 30 * 60 * 1000;

function cacheMovieData(key, data) {
    movieDataCache.set(key, { data, expiresAt: Date.now() + MOVIE_CACHE_TTL_MS });
}

function getCachedMovieData(key) {
    const entry = movieDataCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        movieDataCache.delete(key);
        return null;
    }
    return entry.data;
}

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of movieDataCache.entries()) {
        if (now > entry.expiresAt) movieDataCache.delete(key);
    }
}, 10 * 60 * 1000).unref();

function requireMoviesConfigured(req, res, next) {
    if (!movies.isConfigured()) {
        return res.status(503).json({
            error: 'Movie Roast is not configured on this server.',
            details: 'Set TRAKT_CLIENT_ID to enable it.',
        });
    }
    next();
}

function handleMovieError(res, error) {
    if (error.code === 'PROFILE_PRIVATE') {
        return res.status(403).json({ error: error.message, code: error.code });
    }
    if (error.code === 'PROFILE_NOT_FOUND') {
        return res.status(404).json({ error: error.message, code: error.code });
    }
    if (error.code === 'EMPTY_HISTORY') {
        return res.status(422).json({ error: error.message, code: error.code });
    }
    if (error.code === 'RATE_LIMITED') {
        return res.status(429).json({ error: error.message, code: error.code });
    }
    console.error('Movie data error:', error.message);
    return res.status(502).json({ error: 'Failed to fetch movie data.', details: error.message });
}

// GET-style lookup, matching the "profile" -> "history" -> "roast" pipeline.
// Fetches + normalizes in one call (watched history and ratings both need
// the same profile resolution anyway).
// Lets the frontend show "Trakt connection unavailable" up front on the
// source-selection screen instead of only discovering it after a failed
// request. Read-only, no secrets — just a boolean.
app.get('/api/movies/config', (req, res) => {
    res.json({ traktConfigured: movies.isConfigured() });
});

app.get('/api/movies/profile', requireMoviesConfigured, async (req, res) => {
    const profile = typeof req.query.profile === 'string' ? req.query.profile : null;
    if (!profile) {
        return res.status(400).json({ error: 'Missing "profile" query parameter.' });
    }

    try {
        const cacheKey = movies.parseProfileInput(profile) || profile;
        let data = getCachedMovieData(cacheKey);
        if (!data) {
            data = await movies.fetchNormalizedMovieData(profile);
            cacheMovieData(cacheKey, data);
        }
        res.json(data);
    } catch (error) {
        handleMovieError(res, error);
    }
});

app.get('/api/movies/history', requireMoviesConfigured, async (req, res) => {
    const profile = typeof req.query.profile === 'string' ? req.query.profile : null;
    if (!profile) {
        return res.status(400).json({ error: 'Missing "profile" query parameter.' });
    }

    try {
        const cacheKey = movies.parseProfileInput(profile) || profile;
        let data = getCachedMovieData(cacheKey);
        if (!data) {
            data = await movies.fetchNormalizedMovieData(profile);
            cacheMovieData(cacheKey, data);
        }
        res.json({ movies: data.movies });
    } catch (error) {
        handleMovieError(res, error);
    }
});

// Accepts either a raw "profile" (fetches fresh via Trakt, using the cache
// above) or an already-normalized "movieData" (used by Letterboxd/Top4,
// and to power "Roast Me Again" without re-fetching anything). Only the
// "profile" path actually needs Trakt configured — Letterboxd/Top4 data is
// already normalized client-side and never touches the Trakt service, so
// this route intentionally does NOT sit behind requireMoviesConfigured.
app.post('/api/movies/roast', async (req, res) => {
    const { profile, movieData, provider, intensity } = req.body || {};

    if (provider !== undefined && typeof provider !== 'string') {
        return res.status(400).json({ error: 'provider must be a string if provided.' });
    }
    if (intensity !== undefined && !aiProviders.isValidIntensity(intensity)) {
        return res.status(400).json({
            error: `intensity must be one of: ${aiProviders.INTENSITY_LEVELS.join(', ')}`,
        });
    }

    try {
        let data = movieData;
        if (!data) {
            if (!profile || typeof profile !== 'string') {
                return res.status(400).json({ error: 'Missing "profile" (or "movieData") in request body.' });
            }
            if (!movies.isConfigured()) {
                return res.status(503).json({
                    error: 'Trakt connection unavailable.',
                    details: 'Set TRAKT_CLIENT_ID to enable Trakt-based roasts.',
                });
            }
            const cacheKey = movies.parseProfileInput(profile) || profile;
            data = getCachedMovieData(cacheKey);
            if (!data) {
                data = await movies.fetchNormalizedMovieData(profile);
                cacheMovieData(cacheKey, data);
            }
        }

        const isValidMovieList = (v) =>
            Array.isArray(v) && v.every((m) => m && typeof m.title === 'string' && Array.isArray(m.genres));
        if (
            typeof data?.totalMovies !== 'number' ||
            !isValidMovieList(data?.movies) ||
            !Array.isArray(data?.topGenres)
        ) {
            return res.status(400).json({ error: 'Invalid or incomplete movie data provided.' });
        }

        const { roastText, provider: usedProvider } = await aiProviders.generateRoast(
            data,
            provider || null,
            'movies',
            intensity
        );

        res.json({ roastText, provider: usedProvider, movieData: data });
    } catch (error) {
        handleMovieError(res, error);
    }
});

// --- VALORANT Roast endpoints ---
// Riot Sign On (RSO) authorization-code flow, entirely server-owned: the
// frontend only ever hits GET /api/valorant/auth to kick things off and
// gets redirected straight back to /valorant-roast when it's done. The
// CSRF `state` value and the resulting Riot access token both live only
// on the backend, keyed by an opaque sessionId — same session-cache shape
// as the GitHub integration.

const valorantStateStore = new Map(); // state -> { expiresAt }
const VALORANT_STATE_TTL_MS = 10 * 60 * 1000;

const valorantSessionCache = new Map(); // sessionId -> { accessToken, normalized?, expiresAt }
const VALORANT_SESSION_TTL_MS = 30 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [state, entry] of valorantStateStore.entries()) {
        if (now > entry.expiresAt) valorantStateStore.delete(state);
    }
    for (const [id, entry] of valorantSessionCache.entries()) {
        if (now > entry.expiresAt) valorantSessionCache.delete(id);
    }
}, 5 * 60 * 1000).unref();

function requireValorantConfigured(req, res, next) {
    const info = valorant.getActiveProviderInfo();
    if (!info.configured) {
        const uri = process.env.RIOT_RSO_REDIRECT_URI;
        const isPlaceholder = uri && valorant.isPlaceholderRedirectUri(uri);
        return res.status(503).json({
            error: 'VALORANT integration is currently being configured.',
            details: isPlaceholder
                ? 'RIOT_RSO_REDIRECT_URI is still set to the .env.example placeholder value. This must be replaced with the real deployed backend URL before VALORANT login will work.'
                : undefined,
            code: 'NOT_CONFIGURED',
        });
    }
    next();
}

function handleValorantError(res, error) {
    if (error.code === 'EMPTY_HISTORY') {
        return res.status(422).json({ error: error.message, code: error.code });
    }
    if (error.name === 'ValorantAuthError' || error.name === 'ValorantApiError') {
        const statusByCode = {
            TOKEN_EXCHANGE_FAILED: 401,
            FORBIDDEN: 403,
            NOT_FOUND: 404,
            RATE_LIMITED: 429,
            REGION_ERROR: 400,
            API_ERROR: 502,
        };
        return res.status(statusByCode[error.code] || 502).json({ error: error.message, code: error.code });
    }
    console.error('VALORANT error:', error.message);
    return res.status(502).json({ error: 'Failed to complete the VALORANT request.', details: error.message });
}

// Step 1: browser hits this directly (e.g. window.location = ...), we
// generate + store a CSRF state, then 302 to Riot's authorize screen.
app.get('/api/valorant/auth', requireValorantConfigured, (req, res) => {
    const info = valorant.getActiveProviderInfo();
    if (info.provider === 'mock') {
        // Mock mode has no real OAuth hop — go straight back with a mock session.
        const sessionId = `val_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        valorantSessionCache.set(sessionId, { isMock: true, expiresAt: Date.now() + VALORANT_SESSION_TTL_MS });
        const redirect = new URL(process.env.FRONTEND_URL || 'http://localhost:5173');
        redirect.pathname = '/valorant-roast';
        redirect.searchParams.set('session', sessionId);
        return res.redirect(redirect.toString());
    }

    const state = valorant.generateState();
    valorantStateStore.set(state, { expiresAt: Date.now() + VALORANT_STATE_TTL_MS });
    res.redirect(valorant.buildAuthorizeUrl(state));
});

// Step 2: Riot redirects the browser here after the player authorizes (or denies).
app.get('/api/valorant/callback', requireValorantConfigured, async (req, res) => {
    const { code, state, error, error_description: errorDescription } = req.query;
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';

    function redirectWithError(message, errCode) {
        const url = new URL('/valorant-roast', frontendBase);
        url.searchParams.set('error', errCode || 'AUTH_ERROR');
        url.searchParams.set('error_description', message);
        return res.redirect(url.toString());
    }

    if (error) {
        return redirectWithError(
            typeof errorDescription === 'string' ? errorDescription : 'You denied access, or Riot returned an error.',
            'USER_DENIED'
        );
    }

    if (!state || typeof state !== 'string' || !valorantStateStore.has(state)) {
        return redirectWithError('Authentication failed due to a state mismatch. Please try connecting again.', 'INVALID_STATE');
    }
    valorantStateStore.delete(state); // one-time use

    if (!code || typeof code !== 'string') {
        return redirectWithError('Riot did not return an authorization code.', 'MISSING_CODE');
    }

    try {
        const accessToken = await valorant.exchangeCodeForToken(code);
        const sessionId = `val_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        valorantSessionCache.set(sessionId, { accessToken, expiresAt: Date.now() + VALORANT_SESSION_TTL_MS });

        const url = new URL('/valorant-roast', frontendBase);
        url.searchParams.set('session', sessionId);
        res.redirect(url.toString());
    } catch (err) {
        redirectWithError(err.message || 'Failed to complete Riot authentication.', err.code || 'TOKEN_EXCHANGE_FAILED');
    }
});

function getValorantSession(sessionId) {
    const entry = valorantSessionCache.get(sessionId);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry;
}

// Fetches (and caches) the normalized profile for an existing session.
async function resolveValorantProfile(sessionId) {
    const session = getValorantSession(sessionId);
    if (!session) {
        const err = new Error('VALORANT session expired or invalid. Please reconnect.');
        err.code = 'SESSION_EXPIRED';
        throw err;
    }

    if (session.normalized) return session.normalized;

    const normalized = session.isMock
        ? valorant.getMockPlayerData()
        : await valorant.getPlayerDataFromRiot(session.accessToken);

    session.normalized = normalized;
    valorantSessionCache.set(sessionId, session);
    return normalized;
}

app.get('/api/valorant/profile', requireValorantConfigured, async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId query parameter.' });
    }
    try {
        const profile = await resolveValorantProfile(sessionId);
        res.json(profile);
    } catch (error) {
        if (error.code === 'SESSION_EXPIRED') {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        handleValorantError(res, error);
    }
});

app.get('/api/valorant/matches', requireValorantConfigured, async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId query parameter.' });
    }
    try {
        const profile = await resolveValorantProfile(sessionId);
        res.json({ recentMatches: profile.recentMatches });
    } catch (error) {
        if (error.code === 'SESSION_EXPIRED') {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        handleValorantError(res, error);
    }
});

app.post('/api/valorant/roast', requireValorantConfigured, async (req, res) => {
    const { sessionId, provider, intensity } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId in request body.' });
    }
    if (provider !== undefined && typeof provider !== 'string') {
        return res.status(400).json({ error: 'provider must be a string if provided.' });
    }
    if (intensity !== undefined && !aiProviders.isValidIntensity(intensity)) {
        return res.status(400).json({
            error: `intensity must be one of: ${aiProviders.INTENSITY_LEVELS.join(', ')}`,
        });
    }

    try {
        const profile = await resolveValorantProfile(sessionId);

        const { roastText, provider: usedProvider } = await aiProviders.generateRoast(
            profile,
            provider || null,
            'valorant',
            intensity
        );

        res.json({ roastText, provider: usedProvider, profile });
    } catch (error) {
        if (error.code === 'SESSION_EXPIRED') {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        handleValorantError(res, error);
    }
});

// --- Health check (useful for deployment platforms) ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});
