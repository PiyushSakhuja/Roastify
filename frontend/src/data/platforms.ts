import type { Platform } from "../types/platform";
import {
  SpotifyIcon,
  GitHubIcon,
  SteamIcon,
  ValorantIcon,
  MoviesIcon,
  PlusIcon,
} from "../components/icons";

/**
 * Platform display order configuration.
 * 
 * To change the order of platform cards on the dashboard:
 * 1. Modify the PLATFORM_ORDER array below
 * 2. Ensure all platform IDs match those in platformConfigs
 * 
 * Current order: Movies → Spotify → GitHub → Steam → VALORANT → More
 */
export const PLATFORM_ORDER = [
  "movies",
  "spotify",
  "github",
  "steam",
  "valorant",
  "more",
] as const;

/**
 * Central platform configuration.
 * 
 * To add/modify a platform:
 * 1. Add/update entry in platformConfigs below
 * 2. Update PLATFORM_ORDER if needed
 * 3. Add icon import above if new platform
 * 
 * Each platform has:
 * - name: Display name
 * - tagline: Short one-liner
 * - description: Longer description for card
 * - category: For filtering
 * - accent: CSS variable suffix for theming
 * - accentColor: Hex color for Three.js and inline styles
 * - logo: Path to logo asset
 * - icon: React component for vector icon
 * - route: Navigation path
 * - ctaText: Button text when connected
 * - ctaTextDisconnected: Button text when not connected
 * - mockStats: Preview stats shown on card
 * - roastPreview: Sample roast text
 */
const platformConfigs: Record<string, Omit<Platform, "id" | "available" | "connectionState">> = {
  movies: {
    name: "Movies",
    tagline: "Film Taste",
    description: "Your watchlist has 340 titles. You've watched 6.",
    category: "movies",
    accent: "movies",
    accentColor: "#F5C242",
    logo: "/logos/movies.png",
    icon: MoviesIcon,
    route: "/movie-roast",
    ctaText: "Roast Me",
    ctaTextDisconnected: "Connect & Roast",
    mockStats: [
      { label: "Avg. rating given", value: "4.8 / 5" },
      { label: "Rewatches", value: "The Office x14" },
      { label: "Letterboxd streak", value: "0 days" },
    ],
    roastPreview:
      "You rate everything 4 stars or higher. We don't trust a single review you've written.",
  },
  spotify: {
    name: "Spotify",
    tagline: "Music Taste",
    description: "We've heard your top artists. We have questions.",
    category: "music",
    accent: "spotify",
    accentColor: "#1DB954",
    logo: "/logos/spotify.png",
    icon: SpotifyIcon,
    route: "/spotify-roast",
    ctaText: "Roast Me",
    ctaTextDisconnected: "Connect & Roast",
    mockStats: [
      { label: "Top genre", value: "Bedroom pop" },
      { label: "Minutes / day", value: "214" },
      { label: "Skip rate", value: "38%" },
    ],
    roastPreview:
      "Your 'sad girl autumn' playlist has been running since March. It's June.",
  },
  github: {
    name: "GitHub",
    tagline: "Developer Habits",
    description: "Your commit history is a crime scene. We're detectives.",
    category: "developer",
    accent: "github",
    accentColor: "#A78BFA",
    logo: "/logos/github.png",
    icon: GitHubIcon,
    route: "/github-roast",
    ctaText: "Roast Me",
    ctaTextDisconnected: "Connect & Roast",
    mockStats: [
      { label: "Longest streak", value: "4 days" },
      { label: '"fix" commits', value: "212" },
      { label: "Open PRs", value: "17" },
    ],
    roastPreview:
      "37 commits named 'fix' and not one of them fixed anything permanently.",
  },
  steam: {
    name: "Steam",
    tagline: "Gaming Habits",
    description: "847 hours logged. 12 games finished. Bold strategy.",
    category: "gaming",
    accent: "steam",
    accentColor: "#66C0F4",
    logo: "/logos/steam.png",
    icon: SteamIcon,
    route: "/steam-roast",
    ctaText: "Roast Me",
    ctaTextDisconnected: "Connect & Roast",
    mockStats: [
      { label: "Library size", value: "312 games" },
      { label: "Never launched", value: "201" },
      { label: "Most played", value: "CS2" },
    ],
    roastPreview:
      "You own 312 games and have played 9. The other 303 are a monument to optimism.",
  },
  valorant: {
    name: "VALORANT",
    tagline: "Gaming Stats",
    description: "Your K/D says confident. Your rank says otherwise.",
    category: "gaming",
    accent: "valorant",
    accentColor: "#FF4655",
    logo: "/logos/valorant.png",
    icon: ValorantIcon,
    route: "/valorant-roast",
    ctaText: "Roast Me",
    ctaTextDisconnected: "Connect & Roast",
    mockStats: [
      { label: "Current rank", value: "Silver II" },
      { label: "Reports filed", value: "23 (on you)" },
      { label: "Main agent", value: "Reyna, obviously" },
    ],
    roastPreview:
      "You've been 'one rank away from Immortal' for six seasons running.",
  },
  more: {
    name: "More",
    tagline: "Coming Soon",
    description: "Letterboxd, Duolingo, Strava, and your search history are next.",
    category: "music",
    accent: "smoke",
    accentColor: "#8A8B96",
    logo: "/logos/more.png",
    icon: PlusIcon,
    route: null,
    ctaText: null,
    ctaTextDisconnected: null,
  },
};

/**
 * Build the platforms array by combining configs with runtime state.
 * Order is determined by PLATFORM_ORDER array.
 */
export const platforms: Platform[] = PLATFORM_ORDER.map((id) => {
  const config = platformConfigs[id];
  const isSealed = id === "more";
  
  return {
    id,
    ...config,
    available: !isSealed,
    connectionState: isSealed ? "coming-soon" : "disconnected",
  };
});

export const categories = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "gaming", label: "Gaming" },
  { id: "movies", label: "Movies" },
  { id: "developer", label: "Developer" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
