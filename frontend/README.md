# Roastify — Frontend

"Your digital life. Our judgment." — one React app with two routes:

| Route | Component | What it does |
|---|---|---|
| `/` | `DashboardPage` | Platform picker — Spotify, GitHub, Steam, VALORANT, Movies, more |
| `/spotify-roast` | `SpotifyRoastPage` | Real Spotify OAuth login, token exchange, roast display |

Every platform except Spotify uses mock data via `src/data/platforms.ts`.
Spotify is a real, working integration against [`../backend`](../backend)
(Express + Groq/Mistral/Gemini).

## Stack

- **React 18 + TypeScript + Vite**
- **React Router** for the two routes above
- **Tailwind CSS v4** (CSS-first config via `@theme` in `src/index.css`)
- **Framer Motion** for page-load and interaction animation
- **React Three Fiber / drei / three.js** for the hero's interactive 3D network

## Run it

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview -- -s   # or: npx serve -s dist
```

**Note the `-s` flag** — this is a single-page app with client-side routes,
so the local preview server needs SPA fallback mode too, or a hard
navigation to `/spotify-roast` (exactly what happens when Spotify redirects
back after login) will 404. See the root README's deployment section for
the equivalent config on Vercel/Netlify (`vercel.json` / `public/_redirects`,
both already included here).

## How Spotify connects

Clicking **Connect & Roast** on the Spotify card calls
`navigate("/spotify-roast")` (real React Router navigation, not a full page
redirect) from `DashboardPage`. `SpotifyRoastPage` then:

1. Shows a "Log In with Spotify" button if there's no OAuth callback in the URL yet.
2. On click, `initiateSpotifyLogin()` (`src/integrations/spotify.ts`) does a
   full-page redirect to Spotify's login screen, with a `state` value stored
   in `sessionStorage` for CSRF protection.
3. Spotify redirects back to `/spotify-roast?code=...&state=...` — a real
   hard navigation, landing back in this same app.
4. `useSpotifyRoast()` (`src/hooks/useSpotifyRoast.ts`) detects the callback
   on mount, exchanges the code for a token via the backend's
   `/api/token-exchange`, fetches real top artists/tracks/genres from the
   Spotify Web API, and sends that to `/api/generate-roast`.
5. The page shows the actual roast text, with a "Roast Me Again" button
   (regenerates from the same fetched data) and a link back to `/`.

All of this logic — OAuth, retries, error handling — is ported directly
from the project's original working vanilla-JS implementation, just moved
into a proper route instead of a separate static page. The **visual design
is also a faithful 1:1 port** — same dark-gray/Spotify-green card layout,
same copy, same Tailwind classes as the original `index.html` — scoped via
`src/pages/spotify-roast.css` under a `.spotify-roast-page` wrapper so it
can't clash with the dashboard's separate design system on `/`.

**GitHub, Steam, Movies, and VALORANT are still mock** — no backend
integration exists for them yet, so their "Connect" button just flips local
state in `DashboardPage` so the rest of the dashboard (filters, combined
roast) can be exercised with realistic data. To make one real, follow the
same pattern as Spotify: a dedicated route + integration module + hook,
wired into `DashboardPage`'s `handleConnect`/`handleRoast`.

## Architecture — data-driven platforms

Every platform integration is one config object in `src/data/platforms.ts`:

```ts
{
  id: "github",
  name: "GitHub",
  tagline: "Developer Habits",
  description: "Roast my coding habits",
  category: "developer",
  accent: "github",       // resolves to var(--color-github)
  icon: GitHubIcon,
  available: true,
  connectionState: "connected",
  mockStats: [{ label: "Longest streak", value: "4 days" }],
  roastPreview: "...",
}
```

**No component hardcodes a specific platform.** `PlatformCard`, `PlatformGrid`,
`CategoryFilter`, and `CombinedRoastCard` all render from this array. Adding a
new platform (e.g. Letterboxd) means:

1. Add an icon component to `src/components/icons.tsx` (or reuse an existing one).
2. Add one object to the `platforms` array in `src/data/platforms.ts`.
3. Add its accent color to the `:root` block in `src/index.css` (see the
   comment there — accent colors are referenced dynamically via inline
   styles, so they live outside Tailwind's `@theme` block, which only keeps
   tokens it detects in static utility classes).

## Component map

| Component | Responsibility |
|---|---|
| `Navbar` | Logo, tagline, theme toggle, profile |
| `Hero` | Headline, subcopy, CTAs, hosts the 3D network |
| `HeroNetwork` | R3F scene — lazy-loaded, mouse-reactive node graph |
| `PlatformSection` | Owns category filter state, renders the grid |
| `CategoryFilter` | All / Music / Gaming / Movies / Developer tabs |
| `PlatformGrid` | Maps platforms → `PlatformCard`, handles empty state |
| `PlatformCard` | Single "exhibit" card — icon, stats, connect/roast CTA |
| `ConnectionButton` | Connected / Connect / Sealed (coming soon) states |
| `CombinedRoastCard` | Multi-select connected platforms → one combined roast |
| `RoastModal` | Verdict modal shown after "Roast Me" on a mock card |
| `Footer` | Closing mark |

## Design notes

The visual identity is an "evidence locker / case file" concept rather than
a generic SaaS dashboard: platform cards are numbered "Exhibits," the accent
palette is a single bold verdict-red plus an acid-green "connected" stamp,
with each platform getting its own subtle brand-tinted glow. Display type is
condensed/tabloid (Anton) for verdict-style headlines; body copy stays in
Inter; stats and labels use JetBrains Mono for an evidence-log feel.

The hero's 3D network represents platforms as nodes linked by pulsing lines
around a wireframe core, drifting gently and re-orienting toward the pointer
— built with React Three Fiber, lazy-loaded via `React.lazy` so Three.js
doesn't block first paint.
