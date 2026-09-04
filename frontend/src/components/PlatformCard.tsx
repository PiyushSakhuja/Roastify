import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Platform } from "../types/platform";
import { cx } from "../lib/utils";

interface PlatformCardProps {
  platform: Platform;
  index: number;
}

export function PlatformCard({ platform, index }: PlatformCardProps) {
  const isSealed = platform.connectionState === "coming-soon";
  const exhibitNumber = String(index + 1).padStart(2, "0");

  const cardBody = (
    <>
      {/* Subtle top sheen — premium card feel, not a glow. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Ambient corner glow on hover — only when available. */}
      {!isSealed && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--accent)]/0 blur-3xl transition-all duration-500 group-hover:bg-[var(--accent)]/25" />
      )}

      {/* Eyebrow: exhibit tag */}
      <div className="relative mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-smoke-dim">
          Exhibit {exhibitNumber}
        </span>
        {isSealed && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-smoke-dim">
            Sealed
          </span>
        )}
      </div>

      {/* Real platform logo — same PNG asset the 3D scene uses. */}
      <div
        className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-line"
        style={{ background: `color-mix(in srgb, var(--accent) 12%, transparent)` }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%)` }}
        />
        <img
          src={platform.logo}
          alt={`${platform.name} logo`}
          loading="lazy"
          draggable={false}
          className="relative h-9 w-9 select-none object-contain [image-rendering:auto]"
        />
      </div>

      {/* Title block */}
      <h3 className="font-display text-xl uppercase tracking-wide text-paper">
        {platform.name}
      </h3>
      <p className="mb-3 font-mono text-[0.68rem] uppercase tracking-wider text-[var(--accent)]">
        {platform.tagline}
      </p>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-smoke">
        {platform.description}
      </p>

      {/* CTA — always aligned to the bottom of the card via flex-1 above */}
      {isSealed ? (
        <div className="rounded-full border border-dashed border-line px-4 py-2.5 text-center text-xs font-medium text-smoke-dim">
          Coming soon
        </div>
      ) : (
        <span className="flex items-center justify-center gap-1.5 rounded-full border border-line bg-charcoal-2 px-4 py-2.5 text-sm font-semibold text-paper transition group-hover:border-[var(--accent)]/60">
          Roast Me
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </>
  );

  const sharedClassName = cx(
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5",
    "bg-charcoal/80 backdrop-blur-sm transition-all duration-300",
    isSealed
      ? "border-line/60 opacity-60"
      : "border-line hover:border-[var(--accent)]/50 hover:-translate-y-1"
  );

  const style = { ["--accent" as string]: `var(--color-${platform.accent})` };

  const motionProps = {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, delay: Math.min(index * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] as const },
  };

  if (isSealed) {
    return (
      <motion.article {...motionProps} style={style} className={sharedClassName}>
        {cardBody}
      </motion.article>
    );
  }

  return (
    <motion.div {...motionProps} style={style} className="h-full">
      <Link to={platform.route} className={cx(sharedClassName, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60")}>
        {cardBody}
      </Link>
    </motion.div>
  );
}
