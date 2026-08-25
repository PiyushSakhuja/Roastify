export type PlatformCategory = "music" | "gaming" | "movies" | "developer";

export type ConnectionState = "connected" | "disconnected" | "coming-soon";

export interface PlatformStat {
  label: string;
  value: string;
}

export interface Platform {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: PlatformCategory;
  /** Tailwind color token suffix, e.g. "spotify" -> var(--color-spotify) */
  accent: string;
  /** Icon renderer — kept as a component so icons stay swappable/data-driven */
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  connectionState: ConnectionState;
  mockStats?: PlatformStat[];
  roastPreview?: string;
}
