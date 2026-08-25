import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-line/60 glass"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-sm bg-verdict">
            <span className="font-display text-lg leading-none text-ink">R</span>
            <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-acid animate-pulse-slow" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-display text-[1.05rem] tracking-wide text-paper">
              ROASTIFY
            </span>
            <span className="mt-0.5 hidden font-mono text-[0.6rem] uppercase tracking-[0.2em] text-smoke sm:block">
              Case files on you
            </span>
          </div>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <button
            type="button"
            className="hidden items-center gap-2 rounded-full border border-line bg-charcoal px-3.5 py-2 text-xs font-medium text-smoke transition hover:border-smoke-dim hover:text-paper sm:flex"
          >
            Settings
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-gradient-to-br from-charcoal-2 to-charcoal text-xs font-semibold text-paper"
            aria-label="Profile"
          >
            JD
          </button>
        </div>
      </div>
    </motion.header>
  );
}

function ThemeToggle() {
  // Dark-first product; toggle is present per spec but Roastify's identity
  // is the dark evidence-locker aesthetic, so "light mode" reads as
  // "civilian mode" — a wink rather than a full second theme.
  return (
    <button
      type="button"
      className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-charcoal px-1 py-1 text-smoke"
      aria-label="Toggle theme"
      title="Dark mode (civilian mode coming soon)"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-charcoal-2 text-paper">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <path
            d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full text-smoke-dim">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path
            d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </button>
  );
}
