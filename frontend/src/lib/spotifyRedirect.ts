// src/lib/spotifyRedirect.ts
//
// The dashboard doesn't run its own Spotify OAuth flow. Instead, "Connect &
// Roast" on the Spotify card sends the browser to the existing, working
// classic page (../spotify-roast/) which already handles login, the token
// exchange, fetching top tracks, and calling the AI backend.
//
// Why redirect instead of duplicating the flow in React: Spotify's OAuth
// requires the redirect_uri to exactly match what's registered in the
// Spotify Developer Dashboard. Keeping ONE page as the registered redirect
// target (spotify-roast/index.html) means there's only one URL to register
// and only one place the token-exchange logic lives — the dashboard just
// links to it.

/**
 * Path to the classic Spotify OAuth + roast page, relative to wherever the
 * dashboard is served from. Override by setting `window.SPOTIFY_ROAST_PATH`
 * before the app boots if you deploy it somewhere other than a sibling
 * `/spotify-roast/` path (e.g. a different subdomain).
 */
function getSpotifyRoastUrl(): string {
  const override = (window as any).SPOTIFY_ROAST_PATH as string | undefined;
  if (override) return override;

  // Default: assume spotify-roast/ is deployed as a sibling path to the
  // dashboard, e.g. dashboard at "/" and classic page at "/spotify-roast/".
  return new URL("/spotify-roast/", window.location.origin).toString();
}

/** Sends the browser to the classic Spotify OAuth + roast page. */
export function redirectToSpotifyRoast() {
  window.location.href = getSpotifyRoastUrl();
}
