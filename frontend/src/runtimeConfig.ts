// Populates the window globals that every integrations/*.ts file reads
// (window.ROASTIFY_BACKEND_URL, window.GITHUB_CLIENT_ID) from Vite build-time
// env vars instead of hardcoding them in index.html. This keeps the existing
// window.X read pattern untouched — including in integrations/spotify.ts,
// which is locked and must never be edited — while making the actual values
// environment-specific per deploy.
//
// Set VITE_BACKEND_URL and VITE_GITHUB_CLIENT_ID in your hosting provider's
// env var dashboard, or in a local .env file (see .env.example). Falls back
// to localhost for local dev if unset.

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8888";
const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "";

// True when this is a production build that never had VITE_BACKEND_URL set —
// every "Connect"/"Roast" button will fail with a bare "Failed to fetch"
// because the browser is trying to reach localhost, not a real backend.
// Read by <ConfigWarningBanner /> so this is a visible in-app banner, not
// just a console.error nobody sees until they open devtools.
const isMisconfigured = import.meta.env.PROD && !import.meta.env.VITE_BACKEND_URL;

if (isMisconfigured) {
  console.error(
    "[Roastify] VITE_BACKEND_URL is not set. All API calls will target localhost and fail in production. Set it in your host's environment variables and rebuild."
  );
}

(window as any).ROASTIFY_BACKEND_URL = backendUrl;
(window as any).ROASTIFY_MISCONFIGURED = isMisconfigured;
(window as any).GITHUB_CLIENT_ID = githubClientId;
