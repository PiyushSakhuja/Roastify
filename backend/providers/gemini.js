// providers/gemini.js
// Google Gemini — free tier via Google AI Studio.
// Docs: https://ai.google.dev/gemini-api/docs/pricing

const axios = require('axios');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompt');

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

module.exports = {
    id: 'gemini',
    label: 'Gemini 2.5 Flash',
    isConfigured: () => Boolean(process.env.GEMINI_API_KEY),

    async generateRoast(spotifyData) {
        const userQuery = buildUserPrompt(spotifyData);
        return this.generateCompletion(SYSTEM_PROMPT, userQuery);
    },

    // Generic chat completion, usable by any roast type (Spotify, Steam, ...)
    // that has already built its own system/user prompt strings.
    async generateCompletion(systemPrompt, userPrompt) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

        const fullUrl = `${API_BASE_URL}?key=${apiKey}`;

        const response = await axios.post(
            fullUrl,
            {
                contents: [{ parts: [{ text: userPrompt }] }],
                generationConfig: { temperature: 0.8 },
                systemInstruction: { parts: [{ text: systemPrompt }] },
            },
            { timeout: 20000 }
        );

        const roastText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!roastText) {
            throw new Error('Gemini response missing expected text.');
        }
        return roastText.trim();
    },
};
