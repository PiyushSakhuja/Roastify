import { motion } from "framer-motion";
import { categories, type CategoryId } from "../data/platforms";
import { cx } from "../lib/utils";

interface CategoryFilterProps {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter platforms by category"
      className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-charcoal/60 p-1.5"
    >
      {categories.map((cat) => {
        const isActive = active === cat.id;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(cat.id)}
            className={cx(
              "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              isActive ? "text-ink" : "text-smoke hover:text-paper"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="category-pill"
                className="absolute inset-0 rounded-full bg-acid"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
