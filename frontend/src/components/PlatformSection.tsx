import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Platform } from "../types/platform";
import { type CategoryId } from "../data/platforms";
import { CategoryFilter } from "./CategoryFilter";
import { PlatformGrid } from "./PlatformGrid";

interface PlatformSectionProps {
  platforms: Platform[];
}

export function PlatformSection({ platforms }: PlatformSectionProps) {
  const [category, setCategory] = useState<CategoryId>("all");

  const filtered = useMemo(() => {
    if (category === "all") return platforms;
    return platforms.filter((p) => p.category === category);
  }, [category, platforms]);

  return (
    <section id="platforms" className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mb-10 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className="mb-2 inline-block font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke-dim">
            Evidence locker
          </span>
          <h2 className="font-display text-3xl uppercase tracking-tight text-paper sm:text-4xl">
            Pick your exhibit
          </h2>
        </div>
        <CategoryFilter active={category} onChange={setCategory} />
      </motion.div>

      <PlatformGrid platforms={filtered} />
    </section>
  );
}
