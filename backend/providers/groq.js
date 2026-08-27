// providers/groq.js
// Groq — free tier, OpenAI-compatible chat completions API, runs Llama models fast.
// Docs: https://console.groq.com/docs/quickstart

const axios = require('axios');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompt');

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// llama-3.3-70b-versatile is on Groq's free tier as of writing.
// Override via GROQ_MODEL env var if Groq changes their free-tier lineup.
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

module.exports = {
    id: 'groq',
    label: 'Groq (Llama 3.3 70B)',
    isConfigured: () => Boolean(process.env.GROQ_API_KEY),

    async generateRoast(spotifyData) {
        const userQuery = buildUserPrompt(spotifyData);
        return this.generateCompletion(SYSTEM_PROMPT, userQuery);
    },

    // Generic chat completion, usable by any roast type (Spotify, Steam, ...)
    // that has already built its own system/user prompt strings.
    async generateCompletion(systemPrompt, userPrompt) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY is not set.');

        const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

        const response = await axios.post(
            API_URL,
            {
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.8,
                max_tokens: 300,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 20000,
            }
        );

        const roastText = response.data?.choices?.[0]?.message?.content;
        if (!roastText) {
            throw new Error('Groq response missing expected text.');
        }
        return roastText.trim();
    },
};
