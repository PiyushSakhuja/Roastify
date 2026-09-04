// services/valorant.js
//
// VALORANT integration via Riot Sign On (RSO) + official Riot APIs only.
// No scraping, no unofficial third-party stat sites, no bypassing Riot's
// auth or privacy controls. Everything here follows Riot's documented
// OAuth authorization-code flow (https://developer.riotgames.com/docs/lol#rso-integration)
// adapted for VALORANT match/account endpoints.
//
// Architecture (mirrors the spec's provider model):
//   ValorantProvider (interface)
//     -> RiotValorantProvider  (real Riot RSO + Riot API calls)
//     -> MockValorantProvider  (clearly labeled dev/UI-testing stand-in)
//
// Selected via VALORANT_PROVIDER=riot|mock. Real credentials are required
// for "riot" mode; if they're missing, the server treats the integration
// as "being configured" rather than silently falling back to mock data —
// mock data is never served in place of a real connection.

const crypto = require('crypto');
const axios = require('axios');

const RIOT_RSO_CLIENT_ID = process.env.RIOT_RSO_CLIENT_ID;
const RIOT_RSO_CLIENT_SECRET = process.env.RIOT_RSO_CLIENT_SECRET;
const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_RSO_REDIRECT_URI = process.env.RIOT_RSO_REDIRECT_URI;
const VALORANT_PROVIDER = (process.env.VALORANT_PROVIDER || 'riot').toLowerCase();

// Riot's global auth endpoints (same for all regions/games).
const RIOT_AUTH_BASE = 'https://auth.riotgames.com';
// Regional routing for VALORANT match/account data. Riot's continental
// clusters for VALORANT are: americas, europe, asia. Configurable in case
// a future account is in a different cluster than the default.
const RIOT_API_CLUSTER = process.env.RIOT_API_CLUSTER || 'americas';
const RIOT_API_BASE = `https://${RIOT_API_CLUSTER}.api.riotgames.com`;
const REQUEST_TIMEOUT = 15000;
const MAX_MATCHES = 15; // Keep the AI payload compact — aggregate stats, not raw histories.

function isRiotConfigured() {
    return Boolean(
        RIOT_RSO_CLIENT_ID &&
        RIOT_RSO_CLIENT_SECRET &&
        RIOT_API_KEY &&
        RIOT_RSO_REDIRECT_URI &&
        !isPlaceholderRedirectUri(RIOT_RSO_REDIRECT_URI)
    );
}

/**
 * Catches the single most common misconfiguration: copy-pasting the example
 * value from .env.example (which uses your-backend.example.com as a stand-in)
 * without replacing it with a real deployed URL. Without this check,
 * isConfigured() would happily report "configured" and Riot would redirect
 * users straight into a domain that doesn't exist after they log in.
 */
function isPlaceholderRedirectUri(uri) {
    return /example\.com|your-backend|localhost:PORT|CHANGE_?ME/i.test(uri);
}

/**
 * Reports which provider is actually active. Mock is only ever used when
 * explicitly configured (VALORANT_PROVIDER=mock) — real Riot credentials
 * being absent means "not configured," not an automatic mock fallback.
 */
function getActiveProviderInfo() {
    if (VALORANT_PROVIDER === 'mock') {
        return { provider: 'mock', configured: true };
    }
    return { provider: 'riot', configured: isRiotConfigured() };
}

class ValorantAuthError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'ValorantAuthError';
        this.code = code || 'AUTH_ERROR';
    }
}

class ValorantApiError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'ValorantApiError';
        this.code = code || 'API_ERROR';
    }
}

/* ------------------------------------------------------------------ */
/* RSO OAuth (state + authorization-code flow, server-owned)           */
/* ------------------------------------------------------------------ */

/** Generates a cryptographically random state token for CSRF protection. */
function generateState() {
    return crypto.randomBytes(16).toString('hex');
}

/** Builds the URL to send the user's browser to for Riot Sign On. */
function buildAuthorizeUrl(state) {
    const url = new URL(`${RIOT_AUTH_BASE}/authorize`);
    url.searchParams.set('client_id', RIOT_RSO_CLIENT_ID);
    url.searchParams.set('redirect_uri', RIOT_RSO_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    // "openid" is required by RSO; account data comes from the separate
    // Riot Account API using the resulting access token.
    url.searchParams.set('scope', 'openid');
    url.searchParams.set('state', state);
    return url.toString();
}

/** Exchanges an authorization code for an access token (server-side only). */
async function exchangeCodeForToken(code) {
    try {
        const response = await axios.post(
            `${RIOT_AUTH_BASE}/token`,
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: RIOT_RSO_REDIRECT_URI,
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization:
                        'Basic ' +
                        Buffer.from(`${RIOT_RSO_CLIENT_ID}:${RIOT_RSO_CLIENT_SECRET}`).toString('base64'),
                },
                timeout: REQUEST_TIMEOUT,
            }
        );
        return response.data.access_token;
    } catch (error) {
        throw new ValorantAuthError(
            'Riot rejected the authorization code. Please try connecting again.',
            'TOKEN_EXCHANGE_FAILED'
        );
    }
}

/* ------------------------------------------------------------------ */
/* Riot API calls (server-side, using the player's own access token)   */
/* ------------------------------------------------------------------ */

function riotApiHeaders(accessToken) {
    return {
        Authorization: `Bearer ${accessToken}`,
        'X-Riot-Token': RIOT_API_KEY,
    };
}

/** Riot Account API: resolves the authenticated player's Riot ID + PUUID. */
async function fetchRiotAccount(accessToken) {
    try {
        const response = await axios.get(`https://${RIOT_API_CLUSTER}.api.riotgames.com/riot/account/v1/accounts/me`, {
            headers: riotApiHeaders(accessToken),
            timeout: REQUEST_TIMEOUT,
        });
        return response.data; // { puuid, gameName, tagLine }
    } catch (error) {
        mapAndThrowApiError(error, 'Failed to fetch your Riot account identity.');
    }
}

/**
 * VALORANT match history + per-match details. Riot's VALORANT match API
 * (`/val/match/v1`) is region-scoped (na/eu/ap/kr, distinct from the
 * account API's continental cluster) — for now we default to the same
 * region unless overridden, since match-v1 region selection ultimately
 * depends on the shard the account plays on, which isn't always knowable
 * ahead of time without an extra lookup.
 */
async function fetchMatchHistory(puuid, accessToken, region) {
    try {
        const listResp = await axios.get(
            `https://${region}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${puuid}`,
            { headers: riotApiHeaders(accessToken), timeout: REQUEST_TIMEOUT }
        );
        const historyEntries = (listResp.data?.history || []).slice(0, MAX_MATCHES);

        const matches = await Promise.all(
            historyEntries.map(async (entry) => {
                try {
                    const matchResp = await axios.get(
                        `https://${region}.api.riotgames.com/val/match/v1/matches/${entry.matchId}`,
                        { headers: riotApiHeaders(accessToken), timeout: REQUEST_TIMEOUT }
                    );
                    return matchResp.data;
                } catch {
                    return null; // Skip any single match that fails to load rather than failing the whole roast.
                }
            })
        );

        return matches.filter(Boolean);
    } catch (error) {
        mapAndThrowApiError(error, 'Failed to fetch your VALORANT match history.');
    }
}

function mapAndThrowApiError(error, fallbackMessage) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
        throw new ValorantApiError(
            'Your Riot session is no longer valid, or this data is private/unavailable. Please reconnect.',
            'FORBIDDEN'
        );
    }
    if (status === 404) {
        throw new ValorantApiError('No VALORANT data found for this account.', 'NOT_FOUND');
    }
    if (status === 429) {
        throw new ValorantApiError('Riot API rate limit reached. Please try again shortly.', 'RATE_LIMITED');
    }
    if (status === 400 && String(error.response?.data?.status?.message || '').match(/region/i)) {
        throw new ValorantApiError('Could not resolve the correct Riot region for this account.', 'REGION_ERROR');
    }
    throw new ValorantApiError(fallbackMessage, 'API_ERROR');
}

/* ------------------------------------------------------------------ */
/* Normalization — provider-independent MovieRoastData-style shape     */
/* ------------------------------------------------------------------ */

function normalizeMatches(puuid, rawMatches) {
    const agentCounts = new Map(); // name -> { games, wins }
    const mapCounts = new Map();
    const recentMatches = [];

    let wins = 0;
    let losses = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalHeadshots = 0;
    let totalShots = 0;
    let roundsCounted = 0;

    for (const match of rawMatches) {
        const players = match?.players || [];
        const me = players.find((p) => p.puuid === puuid);
        if (!me) continue;

        const teamId = me.teamId;
        const myTeam = (match.teams || []).find((t) => t.teamId === teamId);
        const won = Boolean(myTeam?.won);
        won ? wins++ : losses++;

        const agentName = me.characterId ? me.characterName || 'Unknown Agent' : me.characterName;
        const mapName = match.matchInfo?.mapId ? formatMapName(match.matchInfo.mapId) : 'Unknown Map';

        const kills = me.stats?.kills ?? undefined;
        const deaths = me.stats?.deaths ?? undefined;
        const assists = me.stats?.assists ?? undefined;

        if (typeof kills === 'number') totalKills += kills;
        if (typeof deaths === 'number') totalDeaths += deaths;
        if (typeof assists === 'number') totalAssists += assists;

        // Headshot % from round-by-round damage breakdown, where present.
        const roundResults = match.roundResults || [];
        for (const round of roundResults) {
            const playerStats = round.playerStats?.find((p) => p.puuid === puuid);
            for (const dmg of playerStats?.damage || []) {
                totalShots += (dmg.legshots || 0) + (dmg.bodyshots || 0) + (dmg.headshots || 0);
                totalHeadshots += dmg.headshots || 0;
                roundsCounted++;
            }
        }

        if (agentName) {
            const cur = agentCounts.get(agentName) || { games: 0, wins: 0 };
            cur.games++;
            if (won) cur.wins++;
            agentCounts.set(agentName, cur);
        }

        if (mapName) {
            const cur = mapCounts.get(mapName) || { games: 0, wins: 0 };
            cur.games++;
            if (won) cur.wins++;
            mapCounts.set(mapName, cur);
        }

        recentMatches.push({
            result: won ? 'win' : 'loss',
            agent: agentName,
            map: mapName,
            kills,
            deaths,
            assists,
        });
    }

    const totalMatches = wins + losses;
    const agents = [...agentCounts.entries()]
        .map(([name, v]) => ({ name, games: v.games, wins: v.wins, winRate: v.games ? round1((v.wins / v.games) * 100) : undefined }))
        .sort((a, b) => b.games - a.games);

    const maps = [...mapCounts.entries()]
        .map(([name, v]) => ({ name, games: v.games, wins: v.wins, winRate: v.games ? round1((v.wins / v.games) * 100) : undefined }))
        .sort((a, b) => b.games - a.games);

    return {
        matchesAnalyzed: totalMatches,
        summary: {
            wins,
            losses,
            winRate: totalMatches ? round1((wins / totalMatches) * 100) : undefined,
            averageKills: totalMatches ? round1(totalKills / totalMatches) : undefined,
            averageDeaths: totalMatches ? round1(totalDeaths / totalMatches) : undefined,
            averageAssists: totalMatches ? round1(totalAssists / totalMatches) : undefined,
            averageHeadshotPercent: totalShots ? round1((totalHeadshots / totalShots) * 100) : undefined,
        },
        agents,
        maps,
        recentMatches: recentMatches.slice(0, 10),
    };
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

function formatMapName(mapId) {
    // Riot's mapId is a long asset path (e.g. .../Duality/Duality) rather
    // than a display name; take the last path segment as a reasonable
    // real-data-derived label without inventing anything not in the ID.
    const segments = String(mapId).split('/').filter(Boolean);
    return segments[segments.length - 1] || 'Unknown Map';
}

/* ------------------------------------------------------------------ */
/* Provider interface                                                  */
/* ------------------------------------------------------------------ */

/**
 * RiotValorantProvider — the real, production data path. Requires an
 * access token from a completed RSO flow.
 */
async function getPlayerDataFromRiot(accessToken) {
    const account = await fetchRiotAccount(accessToken);
    const riotId = `${account.gameName}#${account.tagLine}`;
    const rawMatches = await fetchMatchHistory(account.puuid, accessToken, mapClusterToApiRegion(RIOT_API_CLUSTER));

    if (!rawMatches.length) {
        const err = new Error("This account doesn't have any recent competitive VALORANT match history to roast.");
        err.code = 'EMPTY_HISTORY';
        throw err;
    }

    const normalized = normalizeMatches(account.puuid, rawMatches);

    return {
        riotId,
        region: RIOT_API_CLUSTER,
        ...normalized,
    };
}

/** VALORANT match-v1 uses shard-style region codes distinct from account-v1 clusters. */
function mapClusterToApiRegion(cluster) {
    const map = { americas: 'na', europe: 'eu', asia: 'ap' };
    return map[cluster] || 'na';
}

/**
 * MockValorantProvider — CLEARLY LABELED development/UI-testing data only.
 * Never returned unless VALORANT_PROVIDER=mock is explicitly set. Every
 * field is realistic-looking but synthetic; the roast prompt and UI both
 * receive an explicit `isMock: true` flag so it can never be confused with
 * a real Riot connection.
 */
function getMockPlayerData() {
    const recentMatches = [
        { result: 'loss', agent: 'Jett', map: 'Ascent', kills: 24, deaths: 18, assists: 3 },
        { result: 'win', agent: 'Jett', map: 'Bind', kills: 19, deaths: 12, assists: 5 },
        { result: 'loss', agent: 'Jett', map: 'Haven', kills: 21, deaths: 20, assists: 2 },
        { result: 'win', agent: 'Reyna', map: 'Split', kills: 27, deaths: 14, assists: 1 },
        { result: 'loss', agent: 'Jett', map: 'Ascent', kills: 15, deaths: 19, assists: 4 },
    ];

    return {
        riotId: 'MockPlayer#DEV1',
        region: 'na',
        matchesAnalyzed: recentMatches.length,
        summary: {
            wins: recentMatches.filter((m) => m.result === 'win').length,
            losses: recentMatches.filter((m) => m.result === 'loss').length,
            winRate: round1(
                (recentMatches.filter((m) => m.result === 'win').length / recentMatches.length) * 100
            ),
            averageKills: round1(recentMatches.reduce((s, m) => s + (m.kills || 0), 0) / recentMatches.length),
            averageDeaths: round1(recentMatches.reduce((s, m) => s + (m.deaths || 0), 0) / recentMatches.length),
            averageAssists: round1(recentMatches.reduce((s, m) => s + (m.assists || 0), 0) / recentMatches.length),
            averageHeadshotPercent: 22.4,
        },
        agents: [
            { name: 'Jett', games: 4, wins: 1, winRate: 25 },
            { name: 'Reyna', games: 1, wins: 1, winRate: 100 },
        ],
        maps: [
            { name: 'Ascent', games: 2, wins: 0, winRate: 0 },
            { name: 'Bind', games: 1, wins: 1, winRate: 100 },
            { name: 'Haven', games: 1, wins: 0, winRate: 0 },
            { name: 'Split', games: 1, wins: 1, winRate: 100 },
        ],
        recentMatches,
        isMock: true,
    };
}

module.exports = {
    isRiotConfigured,
    getActiveProviderInfo,
    isPlaceholderRedirectUri,
    generateState,
    buildAuthorizeUrl,
    exchangeCodeForToken,
    getPlayerDataFromRiot,
    getMockPlayerData,
    normalizeMatches, // exported for testing
    ValorantAuthError,
    ValorantApiError,
};
