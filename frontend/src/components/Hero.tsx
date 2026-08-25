import { motion } from "framer-motion";
import { Suspense, lazy } from "react";

const HeroNetwork = lazy(() =>
  import("./HeroNetwork").then((m) => ({ default: m.HeroNetwork }))
);

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-line/60"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-verdict/10 blur-[140px]" />

      <Suspense fallback={null}>
        <HeroNetwork />
      </Suspense>

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-charcoal/80 px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-smoke"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-verdict animate-pulse-slow" />
          Case file open &middot; 2 exhibits connected
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="text-balance font-display text-[2.75rem] uppercase leading-[0.98] tracking-tight text-paper sm:text-[4.75rem]"
        >
          What do you want
          <br />
          <span className="text-verdict">to get roasted</span> for?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mx-auto mt-6 max-w-xl text-balance text-base text-smoke sm:text-lg"
        >
          Connect a platform. We'll read everything, judge you instantly,
          and hand down a verdict with zero chance of appeal.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#platforms"
            className="group relative overflow-hidden rounded-full bg-verdict px-7 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Choose your exhibit
          </a>
          <a
            href="#combined"
            className="rounded-full border border-line bg-charcoal/70 px-7 py-3 text-sm font-semibold text-paper transition hover:border-smoke-dim"
          >
            Roast everything at once
          </a>
        </motion.div>
      </div>
    </section>
  );
}
