// providers/mistral.js
// Mistral AI — free tier via La Plateforme (mistral-small-latest is free-tier eligible).
// Docs: https://docs.mistral.ai/getting-started/quickstart/

const axios = require('axios');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompt');

const API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Override via MISTRAL_MODEL if you have access to a different tier/model.
const DEFAULT_MODEL = 'mistral-small-latest';

module.exports = {
    id: 'mistral',
    label: 'Mistral Small',
    isConfigured: () => Boolean(process.env.MISTRAL_API_KEY),

    async generateRoast(spotifyData) {
        const userQuery = buildUserPrompt(spotifyData);
        return this.generateCompletion(SYSTEM_PROMPT, userQuery);
    },

    // Generic chat completion, usable by any roast type (Spotify, Steam, ...)
    // that has already built its own system/user prompt strings.
    async generateCompletion(systemPrompt, userPrompt) {
        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) throw new Error('MISTRAL_API_KEY is not set.');

        const model = process.env.MISTRAL_MODEL || DEFAULT_MODEL;

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
            throw new Error('Mistral response missing expected text.');
        }
        return roastText.trim();
    },
};
