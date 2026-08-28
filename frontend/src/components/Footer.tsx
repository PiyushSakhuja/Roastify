import { BRAND_CONFIG } from "../config/branding";

export function Footer() {
  return (
    <footer className="border-t border-line/60 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-verdict">
            <span className="font-display text-xs leading-none text-ink">
              R
            </span>
          </span>
          <span className="font-mono text-xs uppercase tracking-wider text-smoke-dim">
            {BRAND_CONFIG.name} &middot; {BRAND_CONFIG.tagline}
          </span>
        </div>
        <p className="font-mono text-[0.65rem] text-smoke-dim">
          {BRAND_CONFIG.footerSubtitle}
        </p>
      </div>
    </footer>
  );
}
