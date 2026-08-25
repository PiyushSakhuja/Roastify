# Roastify

Log in with Spotify, get your music taste roasted by an AI agent — pick from
Groq (Llama), Mistral, or Gemini, all on free tiers.

## Project structure

```
.
├── backend/                  # Express API: Spotify token exchange + AI roast endpoint
│   ├── server.js
│   ├── providers/
│   │   ├── index.js          # Provider registry + fallback chain logic
│   │   ├── prompt.js         # Shared system/user prompt used by every provider
│   │   ├── groq.js           # Groq (Llama 3.3 70B) — free tier
│   │   ├── mistral.js        # Mistral Small — free tier
│   │   └── gemini.js         # Gemini 2.5 Flash — free tier
│   ├── package.json
│   └── .env.example          # Copy to backend/.env and fill in secrets
│
└── frontend/                 # ONE React app — dashboard + Spotify OAuth page
    ├── src/pages/
    │   ├── DashboardPage.tsx     # "/" — the platform picker
    │   └── SpotifyRoastPage.tsx  # "/spotify-roast" — real Spotify login + roast
    └── ...                    # See frontend/README.md
```

**There is one frontend now**, not two. Clicking **Connect & Roast** on the
Spotify card navigates (via React Router, client-side) to `/spotify-roast`
within the same app — no cross-app redirect, no separate static folder to
keep in sync with the dashboard's URL. That page owns the real Spotify
login, `state`-based CSRF check, token exchange, and roast display, talking
to `backend/`.

*(Earlier versions of this project had Spotify's OAuth page as a separate
static site the dashboard redirected to. That's been merged in — the
cross-app redirect was fragile: it depended on both apps being deployed at
exactly matching relative paths, which is exactly the kind of thing that
silently breaks. A single app with a real route is simpler and can't drift
apart.)*

## ⚠️ Deployment requirement: SPA fallback

Because `/spotify-roast` is a client-side route, not a real file, your
static host **must** be configured to serve `index.html` for any path it
doesn't recognize — otherwise a hard navigation to `/spotify-roast` (which
is exactly what happens when Spotify redirects the browser back after
login) will 404 instead of loading the app.

This is already handled for the two most common hosts:
- **Vercel** — `frontend/vercel.json` (rewrites everything to `index.html`)
- **Netlify** — `frontend/public/_redirects` (ships into `dist/_redirects` on build)

If you deploy elsewhere (S3+CloudFront, GitHub Pages, nginx, etc.), you
need to configure the equivalent yourself — check your host's docs for
"SPA fallback" or "rewrite all routes to index.html." Testing locally with
`npx serve dist` needs the `-s` flag (`npx serve -s dist`) for the same
reason; without it you'll reproduce a 404 on `/spotify-roast` even though
everything else works.

## AI agents (free tiers)

Roastify can call any combination of these — set as many API keys as you like:

| Provider | Model            | Free tier signup                                    |
|----------|------------------|-------------------------------------------------------|
| Groq     | Llama 3.3 70B    | https://console.groq.com/keys                        |
| Mistral  | Mistral Small    | https://console.mistral.ai/api-keys                   |
| Gemini   | Gemini 2.5 Flash | https://aistudio.google.com/app/apikey                |

- If the frontend doesn't request a specific agent, the backend tries them
  in order (**Groq → Mistral → Gemini** by default) and automatically falls
  back to the next one if a request fails or hits a rate limit.
- Only **one** provider needs to be configured for the app to work — add
  more for redundancy against free-tier rate limits.

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
   - `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Add `http://localhost:5173/spotify-roast` as a Redirect URI (adjust the port if you run the frontend on a different one).
   - At least one of `GROQ_API_KEY`, `MISTRAL_API_KEY`, `GEMINI_API_KEY`.
   - `ALLOWED_ORIGINS` — the origin your frontend is served from, e.g. `http://localhost:5173`.

3. **Run the backend**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:8888` by default (or `$PORT` if set).

4. **Run the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Opens on `http://localhost:5173` by default. Click the Spotify card to
   go through the real login flow.

## Deploying

### Backend (`backend/`)

Deploy to any Node host (Render, Railway, Fly.io, etc.), with the **root/start directory set to `backend/`**:

1. Set the environment variables from `backend/.env.example` in your host's dashboard — **never commit `.env`**.
2. The server reads `process.env.PORT`, so most platforms will work out of the box.
3. Set `ALLOWED_ORIGINS` to your deployed frontend's exact origin — this is a CORS allowlist, not a wildcard, so requests from other origins will be rejected.

### Frontend (`frontend/`)

1. `cd frontend && npm run build` → deploy `frontend/dist/`.
2. **Make sure your host does SPA fallback routing** — see the warning above. Vercel and Netlify configs are already included; other hosts need their own equivalent.
3. In `frontend/index.html`, set `window.ROASTIFY_BACKEND_URL` to your deployed backend's URL before building.
4. In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add your deployed app's `/spotify-roast` URL (e.g. `https://roastify.example.com/spotify-roast`, matching exactly) as a Redirect URI.

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

## Security notes

- Spotify's **Client Secret** and every AI provider's **API key** must only ever live server-side (`backend/.env` / host environment variables). They are never sent to the browser.
- Spotify's **Client ID** is safe to expose in frontend code — it's public by design.
- `/api/*` routes are rate-limited (30 requests / 15 min / IP by default) to protect against abuse of free-tier API usage. Adjust in `backend/server.js` if needed.
- CORS is restricted to the origins listed in `ALLOWED_ORIGINS` — update this when you change where your frontend is hosted.

## License

ISC
