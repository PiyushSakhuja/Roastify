// src/integrations/steam.ts
//
// Steam Roast integration. Unlike Spotify, there's no OAuth here — the user
// just provides a profile URL / vanity name / SteamID64, and every Steam
// Web API call happens server-side (the backend holds STEAM_API_KEY).
// This module only ever talks to the Roastify backend, never Steam directly.

export interface SteamGame {
  name: string;
  playtimeHours: number;
}

export interface SteamRoastData {
  steamId: string;
  username: string;
  avatar?: string;
  profileUrl: string;
  accountAge?: string;
  totalGames: number;
  totalPlaytimeHours: number;
  topGames: SteamGame[];
  recentlyPlayed: SteamGame[];
  unplayedGames?: number;
  achievements?: number;
  /** Full owned-games list, for the library browser. Not sent to the AI. */
  library?: Array<{
    appid: number;
    name: string;
    playtimeHours: number;
    playtimeRecentHours: number;
    iconUrl?: string;
  }>;
}

export class SteamPrivateProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SteamPrivateProfileError";
  }
}

function getBackendUrl(): string {
  return (window as any).ROASTIFY_BACKEND_URL || "http://localhost:8888";
}

/**
 * Robust fetch with exponential backoff. Only retries 429/5xx — retrying a
 * malformed request (4xx) won't help. Mirrors integrations/spotify.ts so
 * both platforms behave identically under flaky network conditions.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
          continue;
        }
        return response; // Let the caller inspect the error body (e.g. 403 private profile).
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
    }
  }
  throw new Error("fetchWithRetry: exhausted retries");
}

/** Fetches the full normalized Steam data (profile + games) for a given profile input. */
export async function fetchSteamData(profileInput: string): Promise<SteamRoastData> {
  const url = new URL(`${getBackendUrl()}/api/steam/games`);
  url.searchParams.set("profile", profileInput);

  const response = await fetchWithRetry(url.toString());
  const data = await response.json();

  if (!response.ok) {
    if (data.code === "PROFILE_PRIVATE" || data.code === "GAME_DETAILS_PRIVATE") {
      throw new SteamPrivateProfileError(
        data.error ||
          "Your Steam game details are private, so Roastify can't access enough data to roast you properly."
      );
    }
    throw new Error(data.details || data.error || "Failed to fetch Steam data.");
  }

  return data as SteamRoastData;
}

/** Sends normalized Steam data (or a raw profile as fallback) to the AI backend for a roast. */
export async function getRoastFromBackend(
  steamData: SteamRoastData,
  provider?: string
): Promise<{ roastText: string; provider?: string; steamData: SteamRoastData }> {
  const payload: Record<string, unknown> = { steamData };
  if (provider) payload.provider = provider;

  const response = await fetchWithRetry(`${getBackendUrl()}/api/steam/roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    if (result.code === "PROFILE_PRIVATE" || result.code === "GAME_DETAILS_PRIVATE") {
      throw new SteamPrivateProfileError(
        result.error ||
          "Your Steam game details are private, so Roastify can't access enough data to roast you properly."
      );
    }
    throw new Error(result.details || result.error || "Backend failed to generate roast.");
  }

  return { roastText: result.roastText, provider: result.provider, steamData: result.steamData ?? steamData };
}

/** Full flow: fetch real Steam data -> generate roast. */
export async function completeSteamRoastFlow(
  profileInput: string,
  provider?: string
): Promise<{ steamData: SteamRoastData; roastText: string; provider?: string }> {
  const steamData = await fetchSteamData(profileInput);
  const { roastText, provider: usedProvider } = await getRoastFromBackend(steamData, provider);
  return { steamData, roastText, provider: usedProvider };
}

/** Fetches which AI agents are configured on the backend (for a provider picker). Shared endpoint with Spotify. */
export async function fetchAvailableProviders(): Promise<
  Array<{ id: string; label: string; configured: boolean }>
> {
  const response = await fetch(`${getBackendUrl()}/api/providers`);
  if (!response.ok) throw new Error(`status ${response.status}`);
  const data = await response.json();
  return data.providers || [];
}
