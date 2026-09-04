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
 * Single source of truth for every platform integration.
 * Adding a new platform = adding one object here. No card component
 * should ever hardcode a specific platform's name, icon, order, or copy.
 *
 * Movies must stay first — every other platform can be reordered freely
 * by editing this array; nothing else in the app hardcodes platform order.
 */
export const platforms: Platform[] = [
  {
    id: "movies",
    name: "Movies",
    tagline: "Film Taste",
    description: "Trakt history, a Letterboxd export, or just your top four. We'll work with what you've got.",
    category: "movies",
    accent: "movies",
    accentColor: "#F5C242",
    logo: "/logos/movies.png",
    icon: MoviesIcon,
    available: true,
    route: "/movie-roast",
    connectionState: "disconnected",
  },
  {
    id: "spotify",
    name: "Spotify",
    tagline: "Music Taste",
    description: "We've heard your top artists. We have questions.",
    category: "music",
    accent: "spotify",
    accentColor: "#1DB954",
    logo: "/logos/spotify.png",
    icon: SpotifyIcon,
    available: true,
    route: "/spotify-roast",
    connectionState: "disconnected",
  },
  {
    id: "github",
    name: "GitHub",
    tagline: "Developer Habits",
    description: "Your commit history is a crime scene. We're detectives.",
    category: "developer",
    accent: "github",
    accentColor: "#A78BFA",
    logo: "/logos/github.png",
    icon: GitHubIcon,
    available: true,
    route: "/github-roast",
    connectionState: "disconnected",
  },
  {
    id: "steam",
    name: "Steam",
    tagline: "Gaming Habits",
    description: "Your library size and your playtime tell two very different stories.",
    category: "gaming",
    accent: "steam",
    accentColor: "#66C0F4",
    logo: "/logos/steam.png",
    icon: SteamIcon,
    available: true,
    route: "/steam-roast",
    connectionState: "disconnected",
  },
  {
    id: "valorant",
    name: "VALORANT",
    tagline: "Gaming Stats",
    description: "Rank, K/D, and agent picks — the whole case file.",
    category: "gaming",
    accent: "valorant",
    accentColor: "#FF4655",
    logo: "/logos/valorant.png",
    icon: ValorantIcon,
    available: true,
    route: "/valorant-roast",
    connectionState: "disconnected",
  },
  {
    id: "more",
    name: "More",
    tagline: "Coming Soon",
    description: "Letterboxd, Duolingo, Strava, and your search history are next.",
    category: "music",
    accent: "smoke",
    accentColor: "#8A8B96",
    logo: "/logos/more.png",
    icon: PlusIcon,
    available: false,
    route: "",
    connectionState: "coming-soon",
  },
];

export const categories = [
  { id: "all", label: "All" },
  { id: "movies", label: "Movies" },
  { id: "music", label: "Music" },
  { id: "gaming", label: "Gaming" },
  { id: "developer", label: "Developer" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
