// src/integrations/github.ts
//
// Real GitHub OAuth (authorization code flow, matching the Roastify
// backend's /api/github/token-exchange endpoint), following the exact same
// pattern as integrations/spotify.ts. The backend does all the actual
// GitHub API calls and data normalization — this module only handles the
// OAuth redirect, the callback parsing, and talking to our own backend.
// The frontend never sees a GitHub access token, only an opaque sessionId.

import type { GitHubRoastData } from "../types/github";

// GitHub OAuth App Client ID — public by design, same as Spotify's Client ID
// in integrations/spotify.ts. Unlike Spotify's, this one can't be hardcoded
// here because it depends on the GitHub OAuth App you register (Spotify's
// was already registered by the project owner). Set it at runtime via
// window.GITHUB_CLIENT_ID in index.html, same pattern as
// window.ROASTIFY_BACKEND_URL.
function getClientId(): string {
  const id = (window as any).GITHUB_CLIENT_ID;
  if (!id) {
    throw new Error(
      "GitHub Client ID is not configured. Set window.GITHUB_CLIENT_ID in index.html."
    );
  }
  return id;
}

// Must exactly match the "Authorization callback URL" registered on the
// GitHub OAuth App.
const REDIRECT_PATH = "/github-roast";

// GitHub's public-data scopes only — no repo write access, no private data.
// "read:user" covers profile fields; public repos/events need no scope at
// all (they're already public), but including it keeps intent explicit.
const SCOPES = "read:user";

function getBackendUrl(): string {
  return (window as any).ROASTIFY_BACKEND_URL || "http://localhost:8888";
}

/**
 * A bare `fetch()` throw (TypeError: Failed to fetch) gives users zero
 * context — could be no internet, could be the backend URL pointing at
 * localhost in a production build, could be CORS. Distinguish the common
 * "can't reach the backend at all" case and say so plainly, since that's
 * almost always either a misconfigured deploy or the backend being down —
 * not something the retry loop can fix.
 */
function toFriendlyNetworkError(error: unknown, url: string): Error {
  const isNetworkFailure = error instanceof TypeError;
  if (!isNetworkFailure) return error instanceof Error ? error : new Error(String(error));

  const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");
  if (isLocalhost && (window as any).ROASTIFY_MISCONFIGURED) {
    return new Error(
      "Can't reach the Roastify backend — this deployment was built without a backend URL configured, so it's trying to reach localhost. This needs to be fixed by whoever deployed the site."
    );
  }
  return new Error(
    `Can't reach the Roastify backend at ${new URL(url).origin}. It may be down, or there may be a network/CORS issue. Try again in a moment.`
  );
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
 * malformed request (4xx) won't help. Identical policy to spotify.ts.
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
      if (i === retries - 1) throw toFriendlyNetworkError(error, url);
      await new Promise((resolve) => setTimeout(resolve, delay * 2 ** i));
    }
  }
  throw new Error("fetchWithRetry: exhausted retries");
}

/** Step 1: redirect the browser into GitHub's OAuth authorize screen. */
export function initiateGitHubLogin() {
  const state = generateRandomString(16);
  sessionStorage.setItem("github_auth_state", state);

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.append("client_id", getClientId());
  authUrl.searchParams.append("redirect_uri", getRedirectUri());
  authUrl.searchParams.append("scope", SCOPES);
  authUrl.searchParams.append("state", state);

  window.location.href = authUrl.toString();
}

/**
 * Step 2: exchange the ?code= for a backend session. Unlike Spotify, the
 * backend hands back an opaque sessionId rather than the raw access token
 * — the frontend never holds a real GitHub token.
 */
async function exchangeCodeForSession(code: string): Promise<string> {
  const response = await fetchWithRetry(`${getBackendUrl()}/api/github/token-exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: getRedirectUri() }),
  });

  const data = await response.json();
  if (data.sessionId) return data.sessionId;
  throw new Error(data.details || data.error || "GitHub token exchange failed.");
}

/**
 * Step 3: ask the backend to fetch+normalize the user's GitHub data and
 * generate a roast from it, all in one call. The backend caches the
 * normalized profile server-side (keyed by sessionId) so a later
 * "Roast Me Again" call skips re-fetching from GitHub's API.
 */
export async function getGitHubRoast(
  sessionId: string,
  provider?: string,
  intensity?: string
): Promise<{ roastText: string; provider?: string; profile: GitHubRoastData }> {
  const response = await fetchWithRetry(`${getBackendUrl()}/api/github/roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, provider, intensity }),
  });

  const result = await response.json();
  if (result.roastText && result.profile) {
    return { roastText: result.roastText, provider: result.provider, profile: result.profile };
  }
  throw new Error(result.details || result.error || "Backend failed to generate GitHub roast.");
}

/** Full flow: exchange code -> get session -> fetch+normalize+roast. */
export async function completeGitHubRoastFlow(
  code: string,
  provider?: string,
  intensity?: string
): Promise<{ sessionId: string; roastText: string; provider?: string; profile: GitHubRoastData }> {
  const sessionId = await exchangeCodeForSession(code);
  const { roastText, provider: usedProvider, profile } = await getGitHubRoast(sessionId, provider, intensity);
  return { sessionId, roastText, provider: usedProvider, profile };
}

/** Parses the current URL for a GitHub OAuth redirect (?code=/&state= or ?error=). */
export function parseGitHubCallback(): {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
  stateValid: boolean;
} {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const storedState = sessionStorage.getItem("github_auth_state");
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
  sessionStorage.removeItem("github_auth_state");
}
