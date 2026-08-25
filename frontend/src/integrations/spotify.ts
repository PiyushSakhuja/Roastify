// src/integrations/spotify.ts
//
// Real Spotify OAuth (authorization code flow, matching the Roastify
// backend's /api/token-exchange endpoint) and top-tracks fetching, ported
// directly from the original working vanilla-JS app (spotify-roast/app.js).
//
// This now runs as a real in-app route (/spotify-roast) instead of a
// separate static page — no cross-app redirect, no path-mismatch bugs.

export interface SpotifyRoastData {
  topArtists: string[];
  topTracks: string[];
  topGenres: string[];
}

// Spotify Client ID is public by design (safe to expose in frontend code).
const CLIENT_ID = "6c8912cc85ba4a4d8b15b1f12bdc0de9";
const SCOPES = "user-top-read user-read-private";

// Must exactly match what's registered as a Redirect URI in the Spotify
// Developer Dashboard: this app's origin + the /spotify-roast route path.
const REDIRECT_PATH = "/spotify-roast";

function getBackendUrl(): string {
  return (window as any).ROASTIFY_BACKEND_URL || "http://localhost:8888";
}

function getRedirectUri(): string {
  return window.location.origin + REDIRECT_PATH;
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

/**
 * Robust fetch with exponential backoff. Only retries 429/5xx — retrying a
 * malformed request (4xx) won't help.
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
        const errorBody = await response.text();
        throw new Error(
          `API call failed with status: ${response.status}. Response: ${errorBody}`
        );
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
    }
  }
  throw new Error("fetchWithRetry: exhausted retries");
}

/** Step 1: redirect the browser into Spotify's login/consent screen. */
export function initiateSpotifyLogin() {
  const state = generateRandomString(16);
  sessionStorage.setItem("spotify_auth_state", state);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", CLIENT_ID);
  authUrl.searchParams.append("scope", SCOPES);
  authUrl.searchParams.append("redirect_uri", getRedirectUri());
  authUrl.searchParams.append("state", state);

  window.location.href = authUrl.toString();
}

/** Step 2: exchange the ?code= for an access token via the backend. */
async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetchWithRetry(`${getBackendUrl()}/api/token-exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: getRedirectUri() }),
  });

  const data = await response.json();
  if (data.access_token) return data.access_token;
  throw new Error(data.details || data.error || "Token exchange failed.");
}

/** Step 3: fetch real top artists/tracks/genres from the Spotify Web API. */
async function fetchSpotifyData(token: string): Promise<SpotifyRoastData> {
  const headers = { Authorization: `Bearer ${token}` };

  let artistsResponse: Response;
  let tracksResponse: Response;
  try {
    artistsResponse = await fetchWithRetry(
      "https://api.spotify.com/v1/me/top/artists?limit=5&time_range=long_term",
      { headers }
    );
    tracksResponse = await fetchWithRetry(
      "https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=long_term",
      { headers }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("status: 401")) {
      throw new Error("Your Spotify session expired. Please log in again.");
    }
    throw error;
  }

  const artistsData = await artistsResponse.json();
  const topArtists = artistsData.items?.length
    ? artistsData.items.map((item: any) => item.name)
    : ["No top artists found"];

  const tracksData = await tracksResponse.json();
  const topTracks = tracksData.items?.length
    ? tracksData.items.map((item: any) => `${item.name} by ${item.artists[0].name}`)
    : ["No top tracks found"];

  const allGenres: string[] = artistsData.items
    ? artistsData.items
        .flatMap((artist: any) => artist.genres as string[])
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
    : [];
  const topGenres = allGenres.length ? allGenres.slice(0, 5) : ["No genre data available"];

  return { topArtists, topTracks, topGenres };
}

/** Step 4: send fetched Spotify data to the backend's roast generator. */
export async function getRoastFromBackend(
  data: SpotifyRoastData,
  provider?: string
): Promise<{ roastText: string; provider?: string }> {
  const payload = provider ? { ...data, provider } : data;

  const response = await fetchWithRetry(`${getBackendUrl()}/api/generate-roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (result.roastText) {
    return { roastText: result.roastText, provider: result.provider };
  }
  throw new Error(result.details || result.error || "Backend failed to generate roast.");
}

/** Full flow: exchange code -> fetch Spotify data -> generate roast. */
export async function completeSpotifyRoastFlow(
  code: string,
  provider?: string
): Promise<{ spotifyData: SpotifyRoastData; roastText: string; provider?: string }> {
  const accessToken = await exchangeCodeForToken(code);
  const spotifyData = await fetchSpotifyData(accessToken);
  const { roastText, provider: usedProvider } = await getRoastFromBackend(
    spotifyData,
    provider
  );
  return { spotifyData, roastText, provider: usedProvider };
}

/** Parses the current URL for an OAuth redirect (?code=/&state= or ?error=). */
export function parseSpotifyCallback(): {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
  stateValid: boolean;
} {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const storedState = sessionStorage.getItem("spotify_auth_state");
  const error = params.get("error");
  const errorDescription = params.get("error_description");

  return {
    code,
    error,
    errorDescription,
    stateValid: Boolean(code) && state === storedState,
  };
}

/** Clears the OAuth query params from the URL bar without a page reload. */
export function clearCallbackParams() {
  window.history.replaceState(null, "", REDIRECT_PATH);
}

export function clearStoredAuthState() {
  sessionStorage.removeItem("spotify_auth_state");
}

/** Fetches which AI agents are configured on the backend (for a provider picker). */
export async function fetchAvailableProviders(): Promise<
  Array<{ id: string; label: string; configured: boolean }>
> {
  const response = await fetch(`${getBackendUrl()}/api/providers`);
  if (!response.ok) throw new Error(`status ${response.status}`);
  const data = await response.json();
  return data.providers || [];
}
