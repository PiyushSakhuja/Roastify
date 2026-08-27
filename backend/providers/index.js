// providers/index.js
//
// Registry of all AI providers.
// Supports:
//   - Spotify
//   - GitHub
//   - Steam
//   - Groq
//   - Mistral
//   - Gemini
//   - provider fallback
//   - custom system/user prompts

const gemini = require('./gemini');
const groq = require('./groq');
const mistral = require('./mistral');

// Order here = default fallback order.
const ALL_PROVIDERS = [
    groq,
    mistral,
    gemini,
];

function getConfiguredProviders() {
    return ALL_PROVIDERS.filter(
        (provider) => provider.isConfigured()
    );
}

function getProviderById(id) {
    return ALL_PROVIDERS.find(
        (provider) => provider.id === id
    );
}

function listProvidersStatus() {
    return ALL_PROVIDERS.map((provider) => ({
        id: provider.id,
        label: provider.label,
        configured: provider.isConfigured(),
    }));
}

/**
 * Generate a roast for Spotify, GitHub, Steam, etc.
 *
 * @param {object} data
 * @param {string|null} preferredProviderId
 * @param {string} kind - spotify | github | steam
 * @returns {Promise<{roastText: string, provider: string}>}
 */
async function generateRoast(
    data,
    preferredProviderId = null,
    kind = 'spotify'
) {
    const configured = getConfiguredProviders();

    if (configured.length === 0) {
        throw new Error(
            'No AI providers are configured. Set at least one of GROQ_API_KEY, MISTRAL_API_KEY, or GEMINI_API_KEY.'
        );
    }

    // --------------------------------------------------
    // Specific provider requested
    // --------------------------------------------------

    if (preferredProviderId) {
        const provider =
            getProviderById(preferredProviderId);

        if (!provider) {
            throw new Error(
                `Unknown provider "${preferredProviderId}". Valid options: ${ALL_PROVIDERS
                    .map((p) => p.id)
                    .join(', ')}`
            );
        }

        if (!provider.isConfigured()) {
            throw new Error(
                `Provider "${preferredProviderId}" is not configured on this server.`
            );
        }

        const roastText =
            await provider.generateRoast(
                data,
                kind
            );

        return {
            roastText,
            provider: provider.id,
        };
    }

    // --------------------------------------------------
    // Automatic fallback
    // --------------------------------------------------

    const errors = [];

    for (const provider of configured) {
        try {
            const roastText =
                await provider.generateRoast(
                    data,
                    kind
                );

            return {
                roastText,
                provider: provider.id,
            };
        } catch (error) {
            errors.push(
                `${provider.id}: ${error.message}`
            );
        }
    }

    throw new Error(
        `All configured providers failed. Details: ${errors.join(' | ')}`
    );
}

/**
 * Generate a roast using an already-built system/user prompt.
 *
 * This is kept for backwards compatibility with routes
 * that don't use getPersona().
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {string|null} preferredProviderId
 * @returns {Promise<{roastText: string, provider: string}>}
 */
async function generateRoastFromPrompt(
    systemPrompt,
    userPrompt,
    preferredProviderId = null
) {
    const configured = getConfiguredProviders();

    if (configured.length === 0) {
        throw new Error(
            'No AI providers are configured. Set at least one of GROQ_API_KEY, MISTRAL_API_KEY, or GEMINI_API_KEY.'
        );
    }

    // --------------------------------------------------
    // Specific provider requested
    // --------------------------------------------------

    if (preferredProviderId) {
        const provider =
            getProviderById(preferredProviderId);

        if (!provider) {
            throw new Error(
                `Unknown provider "${preferredProviderId}". Valid options: ${ALL_PROVIDERS
                    .map((p) => p.id)
                    .join(', ')}`
            );
        }

        if (!provider.isConfigured()) {
            throw new Error(
                `Provider "${preferredProviderId}" is not configured on this server.`
            );
        }

        if (
            typeof provider.generateCompletion !==
            'function'
        ) {
            throw new Error(
                `Provider "${provider.id}" does not support generateCompletion().`
            );
        }

        const roastText =
            await provider.generateCompletion(
                systemPrompt,
                userPrompt
            );

        return {
            roastText,
            provider: provider.id,
        };
    }

    // --------------------------------------------------
    // Automatic fallback
    // --------------------------------------------------

    const errors = [];

    for (const provider of configured) {
        try {
            if (
                typeof provider.generateCompletion !==
                'function'
            ) {
                throw new Error(
                    'generateCompletion() is not supported.'
                );
            }

            const roastText =
                await provider.generateCompletion(
                    systemPrompt,
                    userPrompt
                );

            return {
                roastText,
                provider: provider.id,
            };
        } catch (error) {
            errors.push(
                `${provider.id}: ${error.message}`
            );
        }
    }

    throw new Error(
        `All configured providers failed. Details: ${errors.join(' | ')}`
    );
}

module.exports = {
    generateRoast,
    generateRoastFromPrompt,
    listProvidersStatus,
    getConfiguredProviders,
};