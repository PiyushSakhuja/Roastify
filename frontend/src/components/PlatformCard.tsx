import { motion } from "framer-motion";
import type { Platform } from "../types/platform";
import { ConnectionButton } from "./ConnectionButton";
import { cx } from "../lib/utils";

interface PlatformCardProps {
  platform: Platform;
  index: number;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: (id: string) => void;
  onConnect?: (id: string) => void;
  onRoast?: (id: string) => void;
}

export function PlatformCard({
  platform,
  index,
  selected = false,
  selectable = false,
  onToggleSelect,
  onConnect,
  onRoast,
}: PlatformCardProps) {
  const Icon = platform.icon;
  const isSealed = platform.connectionState === "coming-soon";
  const isConnected = platform.connectionState === "connected";
  const exhibitNumber = String(index + 1).padStart(2, "0");

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
      style={{ ["--accent" as string]: `var(--color-${platform.accent})` }}
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-2xl border p-5",
        "bg-charcoal transition-all duration-300",
        isSealed
          ? "border-line/60 opacity-60"
          : "border-line hover:border-[var(--accent)]/50 hover:-translate-y-1",
        selected && "border-acid/70 ring-1 ring-acid/40"
      )}
    >
      {/* Ambient corner glow on hover */}
      {!isSealed && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--accent)]/0 blur-3xl transition-all duration-500 group-hover:bg-[var(--accent)]/25" />
      )}

      {/* Selection checkbox, for combined roast mode */}
      {selectable && isConnected && (
        <button
          type="button"
          onClick={() => onToggleSelect?.(platform.id)}
          aria-pressed={selected}
          aria-label={`${selected ? "Remove" : "Add"} ${platform.name} to combined roast`}
          className={cx(
            "absolute right-4 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition",
            selected
              ? "border-acid bg-acid text-ink"
              : "border-line bg-ink/60 text-transparent hover:border-smoke-dim"
          )}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path
              d="M3 8.5 6.5 12 13 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Eyebrow: exhibit tag */}
      <div className="relative mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-smoke-dim">
          Exhibit {exhibitNumber}
        </span>
        {!selectable && <ConnectionButton state={platform.connectionState} accent={platform.accent} onConnect={() => onConnect?.(platform.id)} />}
      </div>

      {/* Icon */}
      <div
        className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line text-[var(--accent)]"
        style={{ background: `color-mix(in srgb, var(--accent) 12%, transparent)` }}
      >
        <Icon className="h-6 w-6" />
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

      {/* Mock stats strip */}
      {platform.mockStats && !isSealed && (
        <dl className="mb-5 grid grid-cols-3 gap-2 rounded-lg border border-line/70 bg-ink/40 p-2.5">
          {platform.mockStats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="truncate font-mono text-[0.55rem] uppercase tracking-wide text-smoke-dim">
                {stat.label}
              </dt>
              <dd className="truncate text-xs font-semibold text-paper">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* CTA */}
      {!selectable &&
        (isSealed ? (
          <div className="rounded-full border border-dashed border-line px-4 py-2.5 text-center text-xs font-medium text-smoke-dim">
            Coming soon
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onRoast?.(platform.id)}
            className={cx(
              "flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition",
              isConnected
                ? "bg-verdict text-ink hover:brightness-110"
                : "border border-line bg-charcoal-2 text-paper hover:border-[var(--accent)]/60"
            )}
          >
            {isConnected ? "Roast Me" : "Connect & Roast"}
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
    </motion.article>
  );
}
