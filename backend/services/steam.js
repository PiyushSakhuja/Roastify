// services/steam.js
// Server-side Steam Web API access. The Steam API key never leaves this
// module — it's read from STEAM_API_KEY and only ever used in outbound
// requests made from the backend, never returned to the client.

const axios = require('axios');

const STEAM_API_BASE = 'https://api.steampowered.com';
const REQUEST_TIMEOUT = 15000;

function getApiKey() {
    const key = process.env.STEAM_API_KEY;
    if (!key) throw new Error('STEAM_API_KEY is not set on the server.');
    return key;
}

function isConfigured() {
    return Boolean(process.env.STEAM_API_KEY);
}

/**
 * Accepts a full profile URL, a vanity URL fragment, or a raw SteamID64
 * and returns just the identifying fragment/ID we need to resolve.
 * Examples handled:
 *   https://steamcommunity.com/id/example
 *   https://steamcommunity.com/id/example/
 *   steamcommunity.com/profiles/76561198000000000
 *   example
 *   76561198000000000
 */
function parseProfileInput(rawInput) {
    const input = (rawInput || '').trim();
    if (!input) return { type: 'invalid' };

    // Raw SteamID64 (17-digit number starting with 7656119...)
    if (/^\d{17}$/.test(input)) {
        return { type: 'steamid64', value: input };
    }

    try {
        const url = input.startsWith('http') ? new URL(input) : new URL(`https://${input}`);
        const segments = url.pathname.split('/').filter(Boolean);
        // /profiles/{steamid64}
        const profilesIdx = segments.indexOf('profiles');
        if (profilesIdx !== -1 && segments[profilesIdx + 1]) {
            const candidate = segments[profilesIdx + 1];
            if (/^\d{17}$/.test(candidate)) {
                return { type: 'steamid64', value: candidate };
            }
        }
        // /id/{vanity}
        const idIdx = segments.indexOf('id');
        if (idIdx !== -1 && segments[idIdx + 1]) {
            return { type: 'vanity', value: segments[idIdx + 1] };
        }
        // A bare word like "example" parses as a URL with hostname "example"
        // and an empty path — treat the hostname itself as the vanity name.
        if (segments.length === 0 && url.hostname && !url.hostname.includes('.')) {
            return { type: 'vanity', value: url.hostname };
        }
        // Otherwise: some other recognizable path segment, treat the last one as vanity.
        if (segments.length >= 1) {
            return { type: 'vanity', value: segments[segments.length - 1] };
        }
        return { type: 'invalid' };
    } catch {
        // Not a URL at all — treat the whole string as a vanity name.
        return { type: 'vanity', value: input.replace(/^\/+|\/+$/g, '') };
    }
}

/** Resolves a vanity URL fragment to a SteamID64 via ISteamUser/ResolveVanityURL. */
async function resolveVanityUrl(vanity) {
    const response = await axios.get(`${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/`, {
        params: { key: getApiKey(), vanityurl: vanity },
        timeout: REQUEST_TIMEOUT,
    });
    const result = response.data?.response;
    if (result?.success === 1 && result.steamid) {
        return result.steamid;
    }
    throw new Error('Could not resolve that Steam profile URL. Double-check the vanity URL and try again.');
}

/** Given any supported profile input, returns a resolved SteamID64. */
async function resolveToSteamId(rawInput) {
    const parsed = parseProfileInput(rawInput);
    if (parsed.type === 'steamid64') return parsed.value;
    if (parsed.type === 'vanity') return resolveVanityUrl(parsed.value);
    throw new Error(
        'Could not understand that Steam profile. Paste a full profile URL (steamcommunity.com/id/yourname), a vanity name, or a 17-digit SteamID64.'
    );
}

/** GetPlayerSummaries — public profile basics + visibility state. */
async function getPlayerSummary(steamId) {
    const response = await axios.get(`${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/`, {
        params: { key: getApiKey(), steamids: steamId },
        timeout: REQUEST_TIMEOUT,
    });
    const player = response.data?.response?.players?.[0];
    if (!player) throw new Error('Steam profile not found.');
    return player;
}

/**
 * CommunityVisibilityState: 1 = private, 2 = "friends only" (Valve labels this
 * "Friends Only" but game details still generally follow the separate game
 * details visibility, most restrictively treated as private for our purposes
 * when GetOwnedGames comes back empty), 3 = public.
 */
function isProfilePubliclyVisible(player) {
    return player?.communityvisibilitystate === 3;
}

/** GetOwnedGames — the actual library + per-game playtime. Requires public game details. */
async function getOwnedGames(steamId) {
    const response = await axios.get(`${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/`, {
        params: {
            key: getApiKey(),
            steamid: steamId,
            include_appinfo: 1,
            include_played_free_games: 1,
        },
        timeout: REQUEST_TIMEOUT,
    });
    return response.data?.response || {};
}

/** GetRecentlyPlayedGames — last 2 weeks of activity. */
async function getRecentlyPlayedGames(steamId) {
    const response = await axios.get(`${STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/`, {
        params: { key: getApiKey(), steamid: steamId },
        timeout: REQUEST_TIMEOUT,
    });
    return response.data?.response?.games || [];
}

/**
 * GetPlayerAchievements is per-game only — Steam has no "total achievements
 * across the whole library" endpoint. We approximate a total by summing
 * achievement counts across a player's most-played games (bounded, so we
 * don't fan out into hundreds of requests), skipping games that don't
 * support achievements or whose stats are private.
 */
async function estimateAchievementCount(steamId, topGames) {
    const candidates = topGames.slice(0, 5);
    let total = 0;
    let anySucceeded = false;

    await Promise.all(
        candidates.map(async (game) => {
            try {
                const response = await axios.get(`${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/`, {
                    params: { key: getApiKey(), steamid: steamId, appid: game.appid },
                    timeout: REQUEST_TIMEOUT,
                });
                const achievements = response.data?.playerstats?.achievements;
                if (Array.isArray(achievements)) {
                    total += achievements.filter((a) => a.achieved === 1).length;
                    anySucceeded = true;
                }
            } catch {
                // Game has no achievement schema, or stats are private — skip silently.
            }
        })
    );

    return anySucceeded ? total : undefined;
}

function minutesToHours(minutes) {
    return Math.round(((minutes || 0) / 60) * 10) / 10;
}

function calculateAccountAge(timeCreated) {
    if (!timeCreated) return undefined;
    const created = new Date(timeCreated * 1000);
    const now = new Date();
    const years = now.getFullYear() - created.getFullYear();
    const months = now.getMonth() - created.getMonth();
    const totalMonths = years * 12 + months;
    if (totalMonths < 1) return 'Less than a month';
    if (totalMonths < 12) return `${totalMonths} month${totalMonths === 1 ? '' : 's'}`;
    const wholeYears = Math.floor(totalMonths / 12);
    return `${wholeYears} year${wholeYears === 1 ? '' : 's'}`;
}

/**
 * Fetches and normalizes everything the Steam Roast flow needs from a
 * resolved SteamID64. Throws a descriptive error for private profiles
 * instead of silently returning empty/fake data.
 */
async function fetchNormalizedSteamData(steamId) {
    const player = await getPlayerSummary(steamId);

    if (!isProfilePubliclyVisible(player)) {
        const err = new Error(
            "Your Steam game details are private, so Roastify can't access enough data to roast you properly."
        );
        err.code = 'PROFILE_PRIVATE';
        throw err;
    }

    const ownedGamesResponse = await getOwnedGames(steamId);
    const rawGames = ownedGamesResponse.games || [];

    if (!ownedGamesResponse.game_count && rawGames.length === 0) {
        const err = new Error(
            "Your Steam game details are private, so Roastify can't access enough data to roast you properly."
        );
        err.code = 'GAME_DETAILS_PRIVATE';
        throw err;
    }

    const games = rawGames
        .map((g) => ({
            appid: g.appid,
            name: g.name || `Unknown game (${g.appid})`,
            playtimeHours: minutesToHours(g.playtime_forever),
            playtimeRecentHours: minutesToHours(g.playtime_2weeks),
            iconUrl: g.img_icon_url
                ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
                : undefined,
        }))
        .sort((a, b) => b.playtimeHours - a.playtimeHours);

    const totalPlaytimeHours = Math.round(games.reduce((sum, g) => sum + g.playtimeHours, 0) * 10) / 10;
    const topGames = games.slice(0, 10);
    const unplayedGames = games.filter((g) => g.playtimeHours < 0.1).length;

    let recentlyPlayedRaw = [];
    try {
        recentlyPlayedRaw = await getRecentlyPlayedGames(steamId);
    } catch {
        // Non-fatal — recently-played is a nice-to-have, not required for a roast.
    }
    const recentlyPlayed = recentlyPlayedRaw
        .map((g) => ({
            appid: g.appid,
            name: g.name || `Unknown game (${g.appid})`,
            playtimeHours: minutesToHours(g.playtime_2weeks),
        }))
        .sort((a, b) => b.playtimeHours - a.playtimeHours);

    const achievements = await estimateAchievementCount(steamId, games.map((g) => ({ appid: g.appid })).length ? topGames : []);

    return {
        steamId,
        username: player.personaname || 'Unknown',
        avatar: player.avatarfull || player.avatarmedium || player.avatar,
        profileUrl: player.profileurl,
        accountAge: calculateAccountAge(player.timecreated),
        totalGames: games.length,
        totalPlaytimeHours,
        topGames: topGames.map(({ name, playtimeHours }) => ({ name, playtimeHours })),
        recentlyPlayed: recentlyPlayed.map(({ name, playtimeHours }) => ({ name, playtimeHours })),
        unplayedGames,
        achievements,
        // Full game list kept separate from the "normalized for AI" summary
        // above — the library browser needs it, the AI prompt doesn't.
        library: games,
    };
}

module.exports = {
    isConfigured,
    parseProfileInput,
    resolveToSteamId,
    getPlayerSummary,
    isProfilePubliclyVisible,
    fetchNormalizedSteamData,
};
