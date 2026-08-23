// server.js - Secure backend for Spotify Token Exchange + Multi-Provider AI Roast Generation
// Requires: express, axios, cors, dotenv, express-rate-limit

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const aiProviders = require('./providers');

const app = express();
const PORT = process.env.PORT || 8888;

// --- Load Spotify credentials from environment ---
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('FATAL: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set (see .env.example).');
    process.exit(1);
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

// --- Health check (useful for deployment platforms) ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});
