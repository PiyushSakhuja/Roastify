// providers/index.js
// Registry of all AI providers ("agents"). Handles:
//   - listing which providers are configured (have an API key set)
//   - picking a specific provider by id
//   - falling back through providers in order if one fails/is rate-limited

const gemini = require('./gemini');
const groq = require('./groq');
const mistral = require('./mistral');

// Order here = default fallback order when the client doesn't request a
// specific provider. Put your most reliable/preferred free tier first.
const ALL_PROVIDERS = [groq, mistral, gemini];

function getConfiguredProviders() {
    return ALL_PROVIDERS.filter((p) => p.isConfigured());
}

function getProviderById(id) {
    return ALL_PROVIDERS.find((p) => p.id === id);
}

function listProvidersStatus() {
    return ALL_PROVIDERS.map((p) => ({ id: p.id, label: p.label, configured: p.isConfigured() }));
}

/**
 * Generate a roast, either from a specific requested provider, or by
 * falling back through all configured providers in order until one works.
 *
 * @param {object} spotifyData - { topArtists, topTracks, topGenres }
 * @param {string|null} preferredProviderId - specific agent to try first
 * @returns {Promise<{ roastText: string, provider: string }>}
 */
async function generateRoast(spotifyData, preferredProviderId = null) {
    const configured = getConfiguredProviders();

    if (configured.length === 0) {
        throw new Error('No AI providers are configured. Set at least one of GROQ_API_KEY, MISTRAL_API_KEY, or GEMINI_API_KEY.');
    }

    // If a specific provider was requested, try it alone (no silent fallback)
    // so the user gets an honest error if their chosen agent is down.
    if (preferredProviderId) {
        const provider = getProviderById(preferredProviderId);
        if (!provider) {
            throw new Error(`Unknown provider "${preferredProviderId}". Valid options: ${ALL_PROVIDERS.map((p) => p.id).join(', ')}`);
        }
        if (!provider.isConfigured()) {
            throw new Error(`Provider "${preferredProviderId}" is not configured on this server.`);
        }
        const roastText = await provider.generateRoast(spotifyData);
        return { roastText, provider: provider.id };
    }

    // Otherwise, walk the fallback chain.
    const errors = [];
    for (const provider of configured) {
        try {
            const roastText = await provider.generateRoast(spotifyData);
            return { roastText, provider: provider.id };
        } catch (error) {
            errors.push(`${provider.id}: ${error.message}`);
        }
    }

    throw new Error(`All configured providers failed. Details: ${errors.join(' | ')}`);
}

/**
 * Generic version of generateRoast for any platform that has already built
 * its own system/user prompt (e.g. Steam). Reuses the exact same configured-
 * provider list and fallback-chain behavior as the Spotify roast flow, so
 * every platform roasts through the same AI infrastructure.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {string|null} preferredProviderId
 * @returns {Promise<{ roastText: string, provider: string }>}
 */
async function generateRoastFromPrompt(systemPrompt, userPrompt, preferredProviderId = null) {
    const configured = getConfiguredProviders();

    if (configured.length === 0) {
        throw new Error('No AI providers are configured. Set at least one of GROQ_API_KEY, MISTRAL_API_KEY, or GEMINI_API_KEY.');
    }

    if (preferredProviderId) {
        const provider = getProviderById(preferredProviderId);
        if (!provider) {
            throw new Error(`Unknown provider "${preferredProviderId}". Valid options: ${ALL_PROVIDERS.map((p) => p.id).join(', ')}`);
        }
        if (!provider.isConfigured()) {
            throw new Error(`Provider "${preferredProviderId}" is not configured on this server.`);
        }
        const roastText = await provider.generateCompletion(systemPrompt, userPrompt);
        return { roastText, provider: provider.id };
    }

    const errors = [];
    for (const provider of configured) {
        try {
            const roastText = await provider.generateCompletion(systemPrompt, userPrompt);
            return { roastText, provider: provider.id };
        } catch (error) {
            errors.push(`${provider.id}: ${error.message}`);
        }
    }

    throw new Error(`All configured providers failed. Details: ${errors.join(' | ')}`);
}

module.exports = {
    generateRoast,
    generateRoastFromPrompt,
    listProvidersStatus,
    getConfiguredProviders,
};
