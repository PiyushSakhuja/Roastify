// providers/gemini.js
// Google Gemini — free tier via Google AI Studio.
// Docs: https://ai.google.dev/gemini-api/docs/pricing

const axios = require('axios');
const {
    getPersona,
    DEFAULT_KIND,
    SYSTEM_PROMPT,
    buildUserPrompt,
    applyIntensity,
} = require('./prompt');

const API_BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

module.exports = {
    id: 'gemini',
    label: 'Gemini 2.5 Flash',

    isConfigured: () => Boolean(process.env.GEMINI_API_KEY),

    /**
     * Generate roast for Spotify / GitHub / Steam
     *
     * kind can be:
     *   'spotify'
     *   'github'
     *   'steam'
     */
    async generateRoast(data, kind = DEFAULT_KIND, intensity) {
        let systemPrompt;
        let userPrompt;

        // New persona-based system
        if (typeof getPersona === 'function') {
            const persona = getPersona(kind);

            if (persona) {
                systemPrompt = applyIntensity(persona.systemPrompt, intensity);
                userPrompt = persona.buildUserPrompt(data);
            }
        }

        // Fallback for the old Spotify prompt system
        if (!systemPrompt || !userPrompt) {
            systemPrompt = SYSTEM_PROMPT;
            userPrompt = buildUserPrompt(data);
        }

        return this.generateCompletion(
            systemPrompt,
            userPrompt
        );
    },

    /**
     * Generic Gemini completion.
     *
     * Can also be used directly by any roast type
     * if it already has its own prompts.
     */
    async generateCompletion(systemPrompt, userPrompt) {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set.');
        }

        const fullUrl = `${API_BASE_URL}?key=${apiKey}`;

        const response = await axios.post(
            fullUrl,
            {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: userPrompt,
                            },
                        ],
                    },
                ],

                systemInstruction: {
                    parts: [
                        {
                            text: systemPrompt,
                        },
                    ],
                },

                generationConfig: {
                    temperature: 0.8,
                },
            },
            {
                timeout: 20000,
            }
        );

        const roastText =
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!roastText) {
            throw new Error(
                'Gemini response missing expected text.'
            );
        }

        return roastText.trim();
    },
};