# Roastify

Log in with Spotify, get your music taste roasted by an AI agent — pick from
Groq (Llama), Mistral, or Gemini, all on free tiers.

## Project structure

```
.
├── backend/
│   ├── server.js           # Express app: Spotify token exchange + roast endpoint
│   ├── providers/
│   │   ├── index.js        # Provider registry + fallback chain logic
│   │   ├── prompt.js        # Shared system/user prompt used by every provider
│   │   ├── groq.js          # Groq (Llama 3.3 70B) — free tier
│   │   ├── mistral.js       # Mistral Small — free tier
│   │   └── gemini.js        # Gemini 2.5 Flash — free tier
│   ├── package.json
│   └── .env.example         # Copy to backend/.env and fill in secrets
└── frontend/
    ├── index.html
    ├── style.css
    ├── app.js
    └── favicon.png
```

## AI agents (free tiers)

Roastify can call any combination of these — set as many API keys as you like:

| Provider | Model            | Free tier signup                                    |
|----------|------------------|-------------------------------------------------------|
| Groq     | Llama 3.3 70B    | https://console.groq.com/keys                        |
| Mistral  | Mistral Small    | https://console.mistral.ai/api-keys                   |
| Gemini   | Gemini 2.5 Flash | https://aistudio.google.com/app/apikey                |

- If the frontend doesn't request a specific agent, the backend tries them in
  order (**Groq → Mistral → Gemini** by default) and automatically falls back
  to the next one if a request fails or hits a rate limit.
- The frontend shows a dropdown of whichever agents are configured on the
  server (via `GET /api/providers`), so you don't need to redeploy the
  frontend when you add or remove a provider key.
- Only **one** provider needs to be configured for the app to work — add more
  for redundancy against free-tier rate limits.

## Local setup

1. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Add `http://localhost:8888` as a Redirect URI in your app settings.
   - At least one of `GROQ_API_KEY`, `MISTRAL_API_KEY`, `GEMINI_API_KEY`.
   - `ALLOWED_ORIGINS` — the origin(s) your frontend will be served from (comma-separated for multiple).

3. **Run the backend**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:8888` by default (or `$PORT` if set).

4. **Serve the frontend**
   The frontend is static — serve it from the `frontend/` folder with any static file server, e.g.:
   ```bash
   cd frontend
   npx serve .
   ```
   Make sure the URL you serve it from matches a Redirect URI registered in your Spotify app, and update `window.ROASTIFY_BACKEND_URL` in `frontend/index.html` to point at your backend.

## Deploying

### Backend (`backend/`)

Deploy to any Node host (Render, Railway, Fly.io, etc.), with the **root/start directory set to `backend/`**:

1. Set the environment variables from `backend/.env.example` in your host's dashboard — **never commit `.env`**.
2. The server reads `process.env.PORT`, so most platforms will work out of the box.
3. Set `ALLOWED_ORIGINS` to your deployed frontend's exact origin (e.g. `https://roastify.example.com`) — this is a CORS allowlist, not a wildcard, so requests from other origins will be rejected.

### Frontend (`frontend/`)

Deploy as static files to any static host (Vercel, Netlify, GitHub Pages, or served by the same Node app), pointing the host at the `frontend/` folder.

1. In `frontend/index.html`, set `window.ROASTIFY_BACKEND_URL` to your deployed backend's URL.
2. In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add your deployed frontend's exact URL (matching `window.location.origin + window.location.pathname`) as a Redirect URI.

## Adding another AI provider

1. Create `backend/providers/yourprovider.js` following the same shape as `groq.js`/`mistral.js`:
   ```js
   module.exports = {
       id: 'yourprovider',
       label: 'Human-readable name',
       isConfigured: () => Boolean(process.env.YOURPROVIDER_API_KEY),
       async generateRoast(spotifyData) { /* return a string */ },
   };
   ```
2. Import and add it to the `ALL_PROVIDERS` array in `backend/providers/index.js`.
3. Add the corresponding API key to `.env.example` and your deployment's env vars.

No frontend changes needed — the provider dropdown is populated dynamically from `/api/providers`.

## Security notes

- Spotify's **Client Secret** and every AI provider's **API key** must only ever live server-side (`backend/.env` / host environment variables). They are never sent to the browser.
- Spotify's **Client ID** is safe to expose in frontend code — it's public by design.
- `/api/*` routes are rate-limited (30 requests / 15 min / IP by default) to protect against abuse of free-tier API usage. Adjust in `backend/server.js` if needed.
- CORS is restricted to the origins listed in `ALLOWED_ORIGINS` — update this when you change where the frontend is hosted.

## License

ISC
