// providers/mistral.js
// Mistral AI — chat completions API.

const axios = require('axios');

const {
    getPersona,
    DEFAULT_KIND,
    applyIntensity,
} = require('./prompt');

const API_URL =
    'https://api.mistral.ai/v1/chat/completions';

const DEFAULT_MODEL =
    'mistral-small-latest';

module.exports = {
    id: 'mistral',
    label: 'Mistral Small',

    isConfigured: () =>
        Boolean(process.env.MISTRAL_API_KEY),

    // Supports:
    // Spotify
    // GitHub
    // Steam
    async generateRoast(
        data,
        kind = DEFAULT_KIND,
        intensity
    ) {
        const persona = getPersona(kind);

        if (!persona) {
            throw new Error(
                `Unknown roast type: ${kind}`
            );
        }

        const userQuery =
            persona.buildUserPrompt(data);

        return this.generateCompletion(
            applyIntensity(persona.systemPrompt, intensity),
            userQuery
        );
    },

    // Generic completion.
    // Useful if another roast type already
    // provides its own system/user prompts.
    async generateCompletion(
        systemPrompt,
        userPrompt
    ) {
        const apiKey =
            process.env.MISTRAL_API_KEY;

        if (!apiKey) {
            throw new Error(
                'MISTRAL_API_KEY is not set.'
            );
        }

        const model =
            process.env.MISTRAL_MODEL ||
            DEFAULT_MODEL;

        const response = await axios.post(
            API_URL,
            {
                model,

                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: userPrompt,
                    },
                ],

                temperature: 0.8,
                max_tokens: 300,
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${apiKey}`,

                    'Content-Type':
                        'application/json',
                },

                timeout: 20000,
            }
        );

        const roastText =
            response.data
                ?.choices?.[0]
                ?.message?.content;

        if (!roastText) {
            throw new Error(
                'Mistral response missing expected text.'
            );
        }

        return roastText.trim();
    },
};