/**
 * Central branding configuration for Roastify.
 * 
 * To customize branding:
 * 1. Replace logo files in /public/assets/
 * 2. Update the values below
 * 
 * Logo files should be placed in:
 * - /public/assets/roastify-logo.svg (main logo)
 * - /public/assets/roastify-logo-dark.svg (dark mode variant, optional)
 * - /public/assets/favicon.svg (favicon)
 */

export const BRAND_CONFIG = {
  /** Application name displayed in navbar, titles, etc. */
  name: "Roastify",
  
  /** Main logo SVG path - used in navbar, footer, loading states */
  logo: "/assets/roastify-logo.svg",
  
  /** Dark variant logo (optional - falls back to main logo if not provided) */
  logoDark: "/assets/roastify-logo-dark.svg",
  
  /** Favicon path */
  favicon: "/assets/favicon.svg",
  
  /** Tagline shown in footer */
  tagline: "Your digital life. Our judgment.",
  
  /** Footer subtitle */
  footerSubtitle: "No data is stored. Only dignity.",
};

/**
 * Platform logos configuration.
 * 
 * To replace platform logos:
 * 1. Add new SVG/PNG files to /public/assets/platforms/
 * 2. Update the logo path below
 */
export const PLATFORM_LOGOS: Record<string, string> = {
  spotify: "/assets/platforms/spotify.svg",
  github: "/assets/platforms/github.svg",
  steam: "/assets/platforms/steam.svg",
  valorant: "/assets/platforms/valorant.svg",
  movies: "/assets/platforms/movies.svg",
  more: "/assets/platforms/more.svg",
};
