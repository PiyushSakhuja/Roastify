// src/integrations/valorant.ts
//
// VALORANT integration via Riot Sign On (RSO). Unlike Spotify/GitHub, the
// entire OAuth dance (state generation, validation, code exchange) is
// owned by the backend — the frontend's only job is to send the browser
// to GET /api/valorant/auth and, later, read the ?session=/&error= params
// the backend redirects back with. The frontend never sees a Riot access
// token, a client secret, or an authorization code.

export interface ValorantSummary {
  wins: number;
  losses: number;
  winRate?: number;
  averageKills?: number;
  averageDeaths?: number;
  averageAssists?: number;
  averageHeadshotPercent?: number;
}

export interface ValorantAgentStat {
  name: string;
  games: number;
  wins: number;
  winRate?: number;
}

export interface ValorantMapStat {
  name: string;
  games: number;
  wins: number;
  winRate?: number;
}

export interface ValorantRecentMatch {
  result: "win" | "loss";
  agent?: string;
  map?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
}

export interface ValorantRoastData {
  riotId: string;
  region: string;
  matchesAnalyzed: number;
  summary: ValorantSummary;
  agents: ValorantAgentStat[];
  maps: ValorantMapStat[];
  recentMatches: ValorantRecentMatch[];
  /** Present and true only in explicit development/mock mode — never on a real Riot connection. */
  isMock?: boolean;
}

export class ValorantNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValorantNotConfiguredError";
  }
}

export class ValorantSessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValorantSessionExpiredError";
  }
}

function getBackendUrl(): string {
  return (window as any).ROASTIFY_BACKEND_URL || "http://localhost:8888";
}

async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
          continue;
        }
        return response;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
    }
  }
  throw new Error("fetchWithRetry: exhausted retries");
}

/**
 * Step 1: send the browser to the backend's /api/valorant/auth route,
 * which itself redirects into Riot Sign On (or, in explicit mock mode,
 * straight back with a mock session — still via a real HTTP redirect, so
 * the frontend never has to special-case it).
 */
export function initiateValorantLogin() {
  window.location.href = `${getBackendUrl()}/api/valorant/auth`;
}

function throwForErrorBody(data: any, fallback: string): never {
  if (data.code === "NOT_CONFIGURED") {
    throw new ValorantNotConfiguredError(data.error || fallback);
  }
  if (data.code === "SESSION_EXPIRED") {
    throw new ValorantSessionExpiredError(data.error || fallback);
  }
  throw new Error(data.details || data.error || fallback);
}

/** Fetches the normalized VALORANT profile for an already-established session. */
export async function fetchValorantProfile(sessionId: string): Promise<ValorantRoastData> {
  const url = new URL(`${getBackendUrl()}/api/valorant/profile`);
  url.searchParams.set("sessionId", sessionId);

  const response = await fetchWithRetry(url.toString());
  const data = await response.json();
  if (!response.ok) throwForErrorBody(data, "Failed to fetch VALORANT data.");
  return data as ValorantRoastData;
}

/** Generates (or regenerates) a roast for an existing session, reusing cached match data. */
export async function getValorantRoast(
  sessionId: string,
  provider?: string
): Promise<{ roastText: string; provider?: string; profile: ValorantRoastData }> {
  const response = await fetchWithRetry(`${getBackendUrl()}/api/valorant/roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, provider }),
  });

  const result = await response.json();
  if (!response.ok) throwForErrorBody(result, "Backend failed to generate VALORANT roast.");
  return { roastText: result.roastText, provider: result.provider, profile: result.profile };
}

/** Full flow after the OAuth redirect: fetch profile -> generate roast. */
export async function completeValorantRoastFlow(
  sessionId: string,
  provider?: string
): Promise<{ profile: ValorantRoastData; roastText: string; provider?: string }> {
  const profile = await fetchValorantProfile(sessionId);
  const { roastText, provider: usedProvider } = await getValorantRoast(sessionId, provider);
  return { profile, roastText, provider: usedProvider };
}

/**
 * Parses the current URL for a VALORANT OAuth redirect. The backend sends
 * the browser back to /valorant-roast with either ?session=... (success)
 * or ?error=&error_description= (denial/failure) — never a raw code, since
 * the code exchange already happened server-side.
 */
export function parseValorantCallback(): {
  sessionId: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    sessionId: params.get("session"),
    error: params.get("error"),
    errorDescription: params.get("error_description"),
  };
}

export function clearCallbackParams() {
  window.history.replaceState(null, "", "/valorant-roast");
}
