// server.js - Secure backend for Spotify Token Exchange + Multi-Provider AI Roast Generation
// Requires: express, axios, cors, dotenv, express-rate-limit

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const aiProviders = require('./providers');
const steamPrompt = require('./providers/steamPrompt');
const steamService = require('./services/steam');
const github = require('./services/github');
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
    const { profile, steamData, provider } = req.body || {};

    if (provider !== undefined && typeof provider !== 'string') {
        return res.status(400).json({ error: 'provider must be a string if provided.' });
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

        const systemPrompt = steamPrompt.SYSTEM_PROMPT;
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
    const { sessionId, provider } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing sessionId in request body.' });
    }
    if (provider !== undefined && typeof provider !== 'string') {
        return res.status(400).json({ error: 'provider must be a string if provided.' });
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
            'github'
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

// --- Health check (useful for deployment platforms) ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});
