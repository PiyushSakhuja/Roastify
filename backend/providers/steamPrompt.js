// providers/steamPrompt.js
// Steam-specific prompt building. Mirrors prompt.js's pattern (a shared
// SYSTEM_PROMPT + a buildUserPrompt(data) function) but is kept separate
// because the roast subject (a game library) needs different framing than
// music taste. Consumed via aiProviders.generateRoastFromPrompt so it still
// runs through the exact same provider/fallback infrastructure as Spotify.

const SYSTEM_PROMPT =
    "You are 'Backlog Roast Bot,' a sarcastic, cynical, and deeply judgmental AI that critiques a user's Steam " +
    'gaming library and habits. You must be humorous, sharp-witted, and gaming-literate, focusing specifically ' +
    "on the concrete numbers and game titles provided — never generic filler that could apply to anyone's " +
    'library. Reference actual game names, hour counts, and library size where they were given. Never invent ' +
    'facts, and never claim the user spent money unless purchase data is explicitly present. Your response must ' +
    'be a single, short, contemptuous paragraph (4-6 sentences max). Do not use markdown formatting like bullet ' +
    'points or bold text in the final output.';

/**
 * @param {object} data - normalized SteamRoastData-shaped summary
 * @param {string} data.username
 * @param {number} data.totalGames
 * @param {number} data.totalPlaytimeHours
 * @param {{ name: string, playtimeHours: number }[]} data.topGames
 * @param {{ name: string, playtimeHours: number }[]} data.recentlyPlayed
 * @param {number} [data.unplayedGames] - games with ~0 recorded playtime
 * @param {number} [data.achievements]
 */
function buildUserPrompt(data) {
    const {
        username,
        totalGames,
        totalPlaytimeHours,
        topGames = [],
        recentlyPlayed = [],
        unplayedGames,
        achievements,
    } = data;

    const topGamesStr = topGames.length
        ? topGames.map((g) => `${g.name} (${g.playtimeHours}h)`).join(', ')
        : 'no meaningfully-played games found';

    const recentStr = recentlyPlayed.length
        ? recentlyPlayed.map((g) => `${g.name} (${g.playtimeHours}h recently)`).join(', ')
        : 'no recent activity';

    const topGameShare =
        topGames.length && totalPlaytimeHours > 0
            ? Math.round((topGames[0].playtimeHours / totalPlaytimeHours) * 100)
            : null;

    const parts = [
        `Steam username: ${username || 'a mystery gamer'}.`,
        `Owns ${totalGames} games.`,
        `Total recorded playtime: ${totalPlaytimeHours} hours.`,
        `Top games by playtime: ${topGamesStr}.`,
        `Recently played: ${recentStr}.`,
    ];

    if (topGameShare !== null) {
        parts.push(`Their single most-played game accounts for roughly ${topGameShare}% of all their recorded playtime.`);
    }
    if (typeof unplayedGames === 'number') {
        parts.push(`${unplayedGames} of their owned games have little to no recorded playtime.`);
    }
    if (typeof achievements === 'number') {
        parts.push(`They have unlocked ${achievements} achievements total.`);
    }

    return `Roast this user's Steam gaming library and habits based on the following real data: ${parts.join(' ')}`;
}

module.exports = { SYSTEM_PROMPT, buildUserPrompt };
