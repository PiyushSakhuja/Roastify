const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config(); // Use dotenv for local development environment variables

const app = express();
const PORT = process.env.PORT || 8888;

// --- CONFIGURATION ---
// IMPORTANT: For deployment, set these as environment variables on your hosting platform!
const SPOTIFY_CLIENT_ID = process.env.CLIENT_ID || '6c8912cc85ba4a4d8b15b1f12bdc0de9'; // FALLBACK
const SPOTIFY_CLIENT_SECRET = process.env.CLIENT_SECRET || 'f6b2d4b61036420baaa886473e9d51bd'; // REPLACE THIS
const GEMINI_API_KEY = process.env.apiKey || 'YOUR_GEMINI_API_KEY'; // REPLACE THIS

// Middleware
app.use(cors());
app.use(express.json());

// --- SPOTIFY TOKEN EXCHANGE ENDPOINT ---
// Exchanges the temporary authorization code for a permanent access token.
app.post('/api/token-exchange', async (req, res) => {
    const { code, redirect_uri } = req.body;
    
    if (!code || !redirect_uri) {
        return res.status(400).json({ error: "Missing authorization code or redirect URI." });
    }

    try {
        const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

        const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri
        }).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authString}`
            }
        });

        // Forward the token response to the client
        res.json({ access_token: response.data.access_token });

    } catch (error) {
        console.error("Spotify Token Exchange Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to exchange token with Spotify.', details: error.response?.data?.error_description || error.message });
    }
});

// --- GEMINI ROAST GENERATION ENDPOINT ---
// Receives Spotify data from the client and calls the Gemini API securely.
app.post('/api/roast', async (req, res) => {
    const { dataString } = req.body; // Spotify data passed from frontend

    if (!dataString) {
        return res.status(400).json({ error: "Missing Spotify data for the roast." });
    }
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
        return res.status(500).json({ error: "Gemini API Key is not configured on the server." });
    }

    // AI Configuration (moved here from the frontend)
    const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';
    const systemPrompt = "You are 'Sound Roast Bot,' a sarcastic, hyper-cynical, and brutally judgmental AI. Your humor is dark, slightly absurd, and targets the user's predictable, beige, and often embarrassing music choices. Your goal is to deliver a swift, humiliating, and highly memorable critique. Your response must be a single, short, contemptuous paragraph (4-6 sentences max). Do not use markdown formatting like bullet points or bold text in the final output.";
    const userQuery = `Critique this user's music taste based on the following data: ${dataString}`;

    try {
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { 
                temperature: 0.95 // High temperature for creative/dank output
            }
        };

        const geminiResponse = await axios.post(`${API_BASE_URL}?key=${GEMINI_API_KEY}`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const result = geminiResponse.data;
        const roastText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (roastText) {
            // Send the clean roast text back to the frontend
            res.json({ roast: roastText });
        } else {
            console.error("Gemini Response Error:", result);
            res.status(500).json({ error: "AI failed to generate a roast. Check API response structure or safety filters." });
        }

    } catch (error) {
        console.error("Gemini API Call Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to communicate with the Gemini API.', details: error.response?.data?.error || error.message });
    }
});

// --- SERVER STARTUP ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to access the backend.`);
    console.log("NOTE: Ensure you have set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and GEMINI_API_KEY environment variables.");
});