import { AnimatePresence, motion } from "framer-motion";
import type { Platform } from "../types/platform";
import { PlatformCard } from "./PlatformCard";

interface PlatformGridProps {
  platforms: Platform[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onConnect?: (id: string) => void;
  onRoast?: (id: string) => void;
}

export function PlatformGrid({
  platforms,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onConnect,
  onRoast,
}: PlatformGridProps) {
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
          <motion.div
            key={platform.id}
            layout
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <PlatformCard
              platform={platform}
              index={index}
              selectable={selectable}
              selected={selectedIds?.has(platform.id)}
              onToggleSelect={onToggleSelect}
              onConnect={onConnect}
              onRoast={onRoast}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
