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
      {/* Ambient layered glows — soft, not "everything glows". */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[940px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-verdict/10 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 top-10 h-[280px] w-[280px] rounded-full bg-acid/5 blur-[120px]" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-[280px] w-[280px] rounded-full bg-spotify/5 blur-[120px]" />

      {/* Layered backdrop gradients for depth — pure CSS, no premium cost. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,59,59,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_60%,var(--color-ink)_100%)]" />

      {/* The interactive 3D network — sits behind the content. */}
      <Suspense fallback={null}>
        <HeroNetwork />
      </Suspense>

      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-20 text-center sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-charcoal/80 px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-smoke backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-verdict animate-pulse-slow" />
          Case file open &middot; 5 exhibits connected
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
            className="rounded-full border border-line bg-charcoal/70 px-7 py-3 text-sm font-semibold text-paper backdrop-blur-sm transition hover:border-smoke-dim"
          >
            Roast everything at once
          </a>
        </motion.div>

        {/* Small trust row — premium SaaS pattern, not a "stats bar". */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex items-center justify-center gap-6 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-smoke-dim"
        >
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-acid" /> No data stored
          </span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-spotify" /> 5 platforms live
          </span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-verdict" /> Zero appeals
          </span>
        </motion.div>
      </div>
    </section>
  );
}
