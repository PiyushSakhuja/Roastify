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
  /** Hex accent color used by Three.js (the 3D scene can't read CSS vars). */
  accentColor: string;
  /** Real logo asset path under /public/logos/{id}.png — drives both the 3D
   *  sprite texture and the 2D card <img>. Never hardcode a logo per platform;
   *  every platform resolves its logo via this field. */
  logo: string;
  /** Icon renderer — kept for backwards-compat, used by CombinedRoastCard chips
   *  and RoastModal where a vector recolors better than a raster PNG. */
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  connectionState: ConnectionState;
  mockStats?: PlatformStat[];
  roastPreview?: string;
  /** Navigation route for this platform's roast page */
  route?: string | null;
  /** CTA button text when connected */
  ctaText?: string | null;
  /** CTA button text when disconnected */
  ctaTextDisconnected?: string | null;
}
