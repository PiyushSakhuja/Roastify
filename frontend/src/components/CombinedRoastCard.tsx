import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Platform } from "../types/platform";
import { cx } from "../lib/utils";

interface CombinedRoastCardProps {
  connectedPlatforms: Platform[];
}

type RoastStatus = "idle" | "generating" | "done";

export function CombinedRoastCard({
  connectedPlatforms,
}: CombinedRoastCardProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(connectedPlatforms.map((p) => p.id))
  );
  const [status, setStatus] = useState<RoastStatus>("idle");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setStatus("idle");
  }

  function generate() {
    if (selected.size === 0) return;
    setStatus("generating");
    // Mock generation delay — wire up to backend /api/generate-roast later,
    // passing the union of selected platforms' data.
    window.setTimeout(() => setStatus("done"), 1800);
  }

  const hasEnough = selected.size >= 1;

  return (
    <section
      id="combined"
      className="relative overflow-hidden rounded-3xl border border-verdict/25 bg-gradient-to-b from-charcoal to-ink p-6 sm:p-10"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-verdict/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-acid/10 blur-[120px]" />

      <div className="relative">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-verdict/40 bg-verdict/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-verdict">
            🔥 Full case review
          </span>
          <h2 className="font-display text-3xl uppercase tracking-tight text-paper sm:text-4xl">
            Roast my entire digital personality
          </h2>
          <p className="mx-auto max-w-lg text-balance text-sm text-smoke sm:text-base">
            Select every exhibit you want cross-examined. One AI, all your
            evidence, a single unified verdict.
          </p>
        </div>

        {connectedPlatforms.length === 0 ? (
          <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-line py-10 text-center">
            <p className="font-mono text-sm text-smoke">
              Connect at least one platform above to build a case.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap justify-center gap-2.5">
              {connectedPlatforms.map((platform) => {
                const isSelected = selected.has(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => toggle(platform.id)}
                    style={{
                      ["--accent" as string]: `var(--color-${platform.accent})`,
                    }}
                    className={cx(
                      "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-paper"
                        : "border-line bg-charcoal text-smoke hover:text-paper"
                    )}
                  >
                    {/* Real logo — same PNG used in 3D + cards. */}
                    <img
                      src={platform.logo}
                      alt=""
                      aria-hidden="true"
                      className="h-4 w-4 select-none object-contain"
                      draggable={false}
                    />
                    {platform.name}
                    {isSelected && (
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                        <path
                          d="M3 8.5 6.5 12 13 4.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-4">
              <motion.button
                type="button"
                onClick={generate}
                disabled={!hasEnough || status === "generating"}
                whileTap={{ scale: 0.97 }}
                className={cx(
                  "relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold transition",
                  hasEnough
                    ? "bg-verdict text-ink hover:brightness-110"
                    : "cursor-not-allowed bg-charcoal-2 text-smoke-dim"
                )}
              >
                {status === "generating" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
                    Building your case...
                  </span>
                ) : (
                  `Deliver the verdict (${selected.size} exhibit${selected.size === 1 ? "" : "s"})`
                )}
              </motion.button>

              <AnimatePresence mode="wait">
                {status === "done" && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="glass mt-2 max-w-xl rounded-2xl border border-acid/25 p-6 text-left"
                  >
                    <span className="mb-3 inline-block font-mono text-[0.65rem] uppercase tracking-[0.18em] text-acid">
                      Verdict reached
                    </span>
                    <p className="text-balance text-base leading-relaxed text-paper sm:text-lg">
                      You have the music taste of someone still processing a
                      breakup, the commit history of someone who's never
                      finished a side project, and a Steam library that's
                      really just an expensive screensaver. Cohesive, in a
                      concerning way.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
