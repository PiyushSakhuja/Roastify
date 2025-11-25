// server.js - Secure backend for Spotify Token Exchange
// Requires: express, axios, cors, dotenv, body-parser

// --- Setup and Configuration ---
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8888; // Spotify default port for local development

// Load credentials 
// NOTE: These should ideally be loaded from environment variables (process.env)
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
// 💡 NEW: Load Gemini API Key securely
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


// Simple check for required environment variables
if (!CLIENT_ID || !CLIENT_SECRET || !GEMINI_API_KEY) {
    console.error("FATAL: CLIENT_ID, CLIENT_SECRET, and GEMINI_API_KEY must be set (or in .env file).");
    process.exit(1);
}

console.log("Gemini API Key Loaded:", !!GEMINI_API_KEY);
if (!GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY is not set in environment variables!");
}

// --- Middleware ---
// Allow the frontend to access this server
app.use(cors());
app.use(bodyParser.json());

// --- Endpoint for Token Exchange (The secure part) ---
app.post('/api/token-exchange', async (req, res) => {
    // We now extract both the code and the redirect_uri from the request body
    const { code, redirect_uri } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code.' });
    }

    // Crucial check: Ensure the frontend sent a redirect_uri
    if (!redirect_uri) {
        return res.status(400).json({ error: 'Missing redirect_uri in request body. Frontend is misconfigured.' });
    }

    console.log(`Attempting token exchange using code and redirect_uri: ${redirect_uri}`);

    try {
        const tokenUrl = 'https://accounts.spotify.com/api/token';

        // Spotify requires Basic Authorization header with base64 encoded credentials
        const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

        const response = await axios({
            method: 'post',
            url: tokenUrl,
            // POST data must be sent as application/x-www-form-urlencoded
            data: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                // --- CORRECTED: Use the dynamic redirect_uri from the request body ---
                redirect_uri: redirect_uri,
            }).toString(),
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        // Spotify response contains access_token, refresh_token, etc.
        res.json(response.data);

    } catch (error) {
        console.error('Error during token exchange:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: 'Failed to exchange authorization code for access token.',
            details: error.response?.data?.error_description || error.message
        });
    }
});


app.post('/api/generate-roast', async (req, res) => {
    try {
        const data = req.body; // Spotify data sent from frontend

        // Construct the prompt string from the received data
        const dataString = `Top Artists: ${data.topArtists.join(', ')}. Top Tracks: ${data.topTracks.join(', ')}. Top Genres: ${data.topGenres.join(', ')}.`;

        const systemPrompt = "You are 'Sound Roast Bot,' a sarcastic, cynical, and deeply judgmental AI that critiques user's music taste. You must be humorous, sharp-witted, and focus specifically on the artists, genres, and track titles provided. Your response must be a single, short, contemptuous paragraph (4-6 sentences max). Do not use markdown formatting like bullet points or bold text in the final output.";

        const userQuery = `Critique this user's music taste based on the following data: ${dataString}`;

        // Build the full URL using the secure API Key
        const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const fullUrl = `${API_BASE_URL}?key=${GEMINI_API_KEY}`;

        // Perform the secure API call (server-to-server)
        // CORRECTED server.js /api/generate-roast AXIOS CALL

        const response = await axios.post(fullUrl, {
            contents: [{ parts: [{ text: userQuery }] }],

            // THIS IS THE CORRECT NAME
            generationConfig: {
                temperature: 0.8
            },

            // This is the correct way to pass system instruction in the REST API
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        });

        const roastText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (roastText) {
            // Send the final roast back to the frontend
            res.json({ roastText: roastText });
        } else {
            console.error('AI response error:', response.data);
            res.status(500).json({ error: 'Failed to extract text from AI response. Check API usage limits.' });
        }

    } catch (error) {
        console.error('Error generating roast:', error.response ? error.response.data : error.message);
        res.status(500).json({
            error: 'Internal server error during AI generation.',
            details: error.response?.data?.error_description || error.message
        });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server listening securely on port ${PORT}`);
    console.log(`NOTE: Ensure 'http://localhost:${PORT}/index.html' is registered as a Redirect URI in your Spotify App settings.`);
});