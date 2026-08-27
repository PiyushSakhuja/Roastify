// providers/groq.js
// Groq — OpenAI-compatible chat completions API.

const axios = require('axios');

const {
    getPersona,
    DEFAULT_KIND,
    SYSTEM_PROMPT,
    buildUserPrompt,
} = require('./prompt');

const API_URL =
    'https://api.groq.com/openai/v1/chat/completions';

const DEFAULT_MODEL =
    'llama-3.3-70b-versatile';

module.exports = {
    id: 'groq',
    label: 'Groq (Llama 3.3 70B)',

    isConfigured: () =>
        Boolean(process.env.GROQ_API_KEY),

    // Supports Spotify, GitHub and Steam
    async generateRoast(
        data,
        kind = DEFAULT_KIND
    ) {
        let systemPrompt;
        let userPrompt;

        // New persona-based system
        if (typeof getPersona === 'function') {
            const persona = getPersona(kind);

            if (persona) {
                systemPrompt =
                    persona.systemPrompt;

                userPrompt =
                    persona.buildUserPrompt(data);
            }
        }

        // Backwards compatibility with old Spotify prompts
        if (!systemPrompt || !userPrompt) {
            systemPrompt = SYSTEM_PROMPT;
            userPrompt = buildUserPrompt(data);
        }

        return this.generateCompletion(
            systemPrompt,
            userPrompt
        );
    },

    // Generic completion
    // Can be used by any platform that already
    // has its own systemPrompt and userPrompt.
    async generateCompletion(
        systemPrompt,
        userPrompt
    ) {
        const apiKey =
            process.env.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error(
                'GROQ_API_KEY is not set.'
            );
        }

        const model =
            process.env.GROQ_MODEL ||
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
                'Groq response missing expected text.'
            );
        }

        return roastText.trim();
    },
};