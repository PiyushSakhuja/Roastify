import { AnimatePresence, motion } from "framer-motion";
import type { Platform } from "../types/platform";
import { PlatformCard } from "./PlatformCard";

interface PlatformGridProps {
  platforms: Platform[];
}

export function PlatformGrid({ platforms }: PlatformGridProps) {
  if (platforms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line py-16 text-center">
        <p className="font-mono text-sm text-smoke">
          No exhibits match this category. Yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {platforms.map((platform, index) => (
          <motion.div key={platform.id} layout exit={{ opacity: 0, scale: 0.96 }} className="h-full">
            <PlatformCard platform={platform} index={index} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
