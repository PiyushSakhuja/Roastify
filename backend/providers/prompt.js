// providers/prompt.js
// Shared prompt-building logic so every provider roasts the same way,
// regardless of which platform ("kind") the data came from.
//
// Adding a new roastable platform = adding one entry to PERSONAS below.
// Provider files (groq.js/mistral.js/gemini.js) never need to change.

const PERSONAS = {
  spotify: {
    systemPrompt:
        "You are 'Sound Roast Bot,' a sarcastic, cynical, and deeply judgmental AI that critiques a user's music taste. " +
        'You must be humorous, sharp-witted, and focus specifically on the artists, genres, and track titles provided. ' +
        'Your response must be a single, short, contemptuous paragraph (4-6 sentences max). ' +
        'Do not use markdown formatting like bullet points or bold text in the final output.',
    buildUserPrompt: ({ topArtists, topTracks, topGenres }) => {
        const dataString = `Top Artists: ${topArtists.join(', ') || 'None'}. Top Tracks: ${topTracks.join(', ') || 'None'}. Top Genres: ${topGenres.join(', ') || 'None'}.`;
        return `Critique this user's music taste based on the following data: ${dataString}`;
    },
},

    github: {
        systemPrompt:
            "You are 'Commit Roast Bot,' a sharp, technically-literate AI that roasts a developer's GitHub profile and habits. " +
            'You are savage but always accurate — every joke must be traceable to a specific fact in the data you were given. ' +
            'Notice things like: abandoned repositories, one language dominating everything, excessive README-only projects, ' +
            'very few commits, obvious tutorial-following patterns, oddly named repos, one project hoarding all the stars, ' +
            'following far more people than follow them back, ancient untouched repositories, an unhealthy obsession with ' +
            'one framework, overengineered trivial projects, and "I will finish this later" energy. ' +
            'Be funny, sharp, personalized, and technically aware — never generic, and never invent facts that were not ' +
            'given to you. Your response must be a single, short, contemptuous paragraph (4-6 sentences max). ' +
            'Do not use markdown formatting like bullet points or bold text in the final output.',
        buildUserPrompt: (data) => {
            const {
                username,
                name,
                bio,
                publicRepos,
                followers,
                following,
                accountAgeDays,
                topLanguages,
                repositories,
                recentActivity,
            } = data;

            const topRepos = (repositories || [])
                .slice(0, 8)
                .map((r) => {
                    const parts = [r.name];
                    if (r.language) parts.push(`(${r.language})`);
                    if (typeof r.stars === 'number') parts.push(`${r.stars}★`);
                    if (r.description) parts.push(`- "${r.description}"`);
                    return parts.join(' ');
                })
                .join('; ');

            const activitySummary = (recentActivity || [])
                .slice(0, 5)
                .map((a) => `${a.type} on ${a.repo}`)
                .join('; ');

            return [
                `Roast this GitHub profile based ONLY on the following real data — do not invent anything beyond it.`,
                `Username: ${username}.`,
                name ? `Name: ${name}.` : null,
                bio ? `Bio: "${bio}".` : null,
                `Public repos: ${publicRepos}. Followers: ${followers}. Following: ${following}.`,
                typeof accountAgeDays === 'number' ? `Account age: ${accountAgeDays} days.` : null,
                topLanguages?.length ? `Top languages: ${topLanguages.join(', ')}.` : null,
                topRepos ? `Notable repositories: ${topRepos}.` : null,
                activitySummary ? `Recent activity: ${activitySummary}.` : null,
            ]
                .filter(Boolean)
                .join(' ');
        },
    },
};

const DEFAULT_KIND = 'spotify';

function getPersona(kind) {
    return PERSONAS[kind] || PERSONAS[DEFAULT_KIND];
}

/** Kept for backward compatibility — existing Spotify-only call sites. */
const SYSTEM_PROMPT = PERSONAS.spotify.systemPrompt;
function buildUserPrompt(data) {
    return PERSONAS.spotify.buildUserPrompt(data);
}

module.exports = { SYSTEM_PROMPT, buildUserPrompt, getPersona, DEFAULT_KIND };
