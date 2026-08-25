import { AnimatePresence, motion } from "framer-motion";
import type { Platform } from "../types/platform";

interface RoastModalProps {
  platform: Platform | null;
  onClose: () => void;
}

export function RoastModal({ platform, onClose }: RoastModalProps) {
  return (
    <AnimatePresence>
      {platform && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Roast verdict for ${platform.name}`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ ["--accent" as string]: `var(--color-${platform.accent})` }}
            className="glass relative w-full max-w-md overflow-hidden rounded-3xl border border-line p-7"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)]/20 blur-[100px]" />

            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-verdict/15 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-verdict">
                  Verdict reached
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-smoke transition hover:text-paper"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-[var(--accent)]"
                  style={{
                    background: `color-mix(in srgb, var(--accent) 14%, transparent)`,
                  }}
                >
                  <platform.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg uppercase tracking-wide text-paper">
                    {platform.name}
                  </h3>
                  <p className="font-mono text-[0.65rem] uppercase tracking-wider text-smoke-dim">
                    {platform.tagline}
                  </p>
                </div>
              </div>

              <p className="text-balance text-lg leading-relaxed text-paper">
                {platform.roastPreview ??
                  "This exhibit hasn't been connected yet. No data, no verdict."}
              </p>

              <div className="mt-6 flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full border border-line bg-charcoal-2 px-4 py-2.5 text-sm font-medium text-paper transition hover:border-smoke-dim"
                >
                  Close case
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full bg-verdict px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
                >
                  Roast again
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
