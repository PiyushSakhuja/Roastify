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
        <a href="/" className="group flex items-center gap-2.5">
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
      </div>
    </motion.header>
  );
}
