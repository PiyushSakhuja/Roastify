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
 * should ever hardcode a specific platform's name, icon, or copy.
 */
export const platforms: Platform[] = [
  {
    id: "spotify",
    name: "Spotify",
    tagline: "Music Taste",
    description: "We've heard your top artists. We have questions.",
    category: "music",
    accent: "spotify",
    icon: SpotifyIcon,
    available: true,
    connectionState: "disconnected",
    mockStats: [
      { label: "Top genre", value: "Bedroom pop" },
      { label: "Minutes / day", value: "214" },
      { label: "Skip rate", value: "38%" },
    ],
    roastPreview:
      "Your 'sad girl autumn' playlist has been running since March. It's June.",
  },
  {
    id: "github",
    name: "GitHub",
    tagline: "Developer Habits",
    description: "Your commit history is a crime scene. We're detectives.",
    category: "developer",
    accent: "github",
    icon: GitHubIcon,
    available: true,
    connectionState: "disconnected",
    mockStats: [
      { label: "Longest streak", value: "4 days" },
      { label: '"fix" commits', value: "212" },
      { label: "Open PRs", value: "17" },
    ],
    roastPreview:
      "37 commits named 'fix' and not one of them fixed anything permanently.",
  },
  {
    id: "steam",
    name: "Steam",
    tagline: "Gaming Habits",
    description: "847 hours logged. 12 games finished. Bold strategy.",
    category: "gaming",
    accent: "steam",
    icon: SteamIcon,
    available: true,
    connectionState: "disconnected",
    mockStats: [
      { label: "Library size", value: "312 games" },
      { label: "Never launched", value: "201" },
      { label: "Most played", value: "CS2" },
    ],
    roastPreview:
      "You own 312 games and have played 9. The other 303 are a monument to optimism.",
  },
  {
    id: "movies",
    name: "Movies",
    tagline: "Film Taste",
    description: "Your watchlist has 340 titles. You've watched 6.",
    category: "movies",
    accent: "movies",
    icon: MoviesIcon,
    available: true,
    connectionState: "disconnected",
    mockStats: [
      { label: "Avg. rating given", value: "4.8 / 5" },
      { label: "Rewatches", value: "The Office x14" },
      { label: "Letterboxd streak", value: "0 days" },
    ],
    roastPreview:
      "You rate everything 4 stars or higher. We don't trust a single review you've written.",
  },
  {
    id: "valorant",
    name: "VALORANT",
    tagline: "Gaming Stats",
    description: "Your K/D says confident. Your rank says otherwise.",
    category: "gaming",
    accent: "valorant",
    icon: ValorantIcon,
    available: true,
    connectionState: "disconnected",
    mockStats: [
      { label: "Current rank", value: "Silver II" },
      { label: "Reports filed", value: "23 (on you)" },
      { label: "Main agent", value: "Reyna, obviously" },
    ],
    roastPreview:
      "You've been 'one rank away from Immortal' for six seasons running.",
  },
  {
    id: "more",
    name: "More",
    tagline: "Coming Soon",
    description: "Letterboxd, Duolingo, Strava, and your search history are next.",
    category: "music",
    accent: "smoke",
    icon: PlusIcon,
    available: false,
    connectionState: "coming-soon",
  },
];

export const categories = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "gaming", label: "Gaming" },
  { id: "movies", label: "Movies" },
  { id: "developer", label: "Developer" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
