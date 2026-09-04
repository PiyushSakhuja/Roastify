import { cx } from "../../lib/utils";
import { INTENSITY_OPTIONS, type RoastIntensity } from "../../types/intensity";

interface IntensitySelectorProps {
  value: RoastIntensity;
  onChange: (value: RoastIntensity) => void;
  accent: string;
  disabled?: boolean;
}

export function IntensitySelector({ value, onChange, accent, disabled }: IntensitySelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Roast intensity"
      style={{ ["--accent" as string]: `var(--color-${accent})` }}
      className="mx-auto mb-6 flex max-w-xs items-stretch gap-2"
    >
      {INTENSITY_OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cx(
              "flex-1 rounded-lg border px-2 py-2 text-center transition disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-line bg-charcoal-2/60 hover:border-smoke-dim"
            )}
          >
            <span
              className={cx(
                "block text-xs font-semibold uppercase tracking-wide",
                selected ? "text-[var(--accent)]" : "text-paper"
              )}
            >
              {option.label}
            </span>
            <span className="mt-0.5 block text-[0.65rem] text-smoke-dim">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
