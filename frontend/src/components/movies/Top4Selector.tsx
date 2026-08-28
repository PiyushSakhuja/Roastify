import { useState } from "react";
import { buildTop4Data } from "../../integrations/top4";
import type { MovieRoastData } from "../../integrations/movies";

interface Top4SelectorProps {
  onSubmit: (data: MovieRoastData) => void;
  onBack: () => void;
}

const PLACEHOLDERS = ["Interstellar", "The Dark Knight", "Fight Club", "Whiplash"];

/** "Your Top 4" — four plain title inputs, each with clear/replace, no account or API required. */
export function Top4Selector({ onSubmit, onBack }: Top4SelectorProps) {
  const [titles, setTitles] = useState<string[]>(["", "", "", ""]);

  const filledCount = titles.filter((t) => t.trim()).length;
  const isComplete = filledCount === 4;

  function updateTitle(index: number, value: string) {
    setTitles((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function clearTitle(index: number) {
    updateTitle(index, "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) return;
    onSubmit(buildTop4Data(titles));
  }

  return (
    <div className="mx-auto max-w-md">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-smoke transition hover:text-paper"
      >
        &larr; Choose a different source
      </button>

      <div className="rounded-2xl border border-line bg-charcoal/80 p-6 sm:p-8">
        <h2 className="mb-1.5 font-display text-xl uppercase tracking-wide text-paper">Your Top 4</h2>
        <p className="mb-5 text-sm text-smoke">Four movies. That's enough evidence.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {titles.map((title, i) => (
            <div key={i}>
              <label htmlFor={`top4-${i}`} className="mb-1 block font-mono text-[0.6rem] uppercase tracking-wider text-smoke-dim">
                Movie {i + 1}
              </label>
              <div className="relative">
                <input
                  id={`top4-${i}`}
                  type="text"
                  value={title}
                  onChange={(e) => updateTitle(i, e.target.value)}
                  placeholder={PLACEHOLDERS[i]}
                  className="w-full rounded-xl border border-line bg-ink/50 px-4 py-2.5 pr-9 text-sm text-paper placeholder:text-smoke-dim focus:outline-none focus:border-[var(--color-movies)]"
                />
                {title && (
                  <button
                    type="button"
                    onClick={() => clearTitle(i)}
                    aria-label={`Clear movie ${i + 1}`}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-smoke-dim transition hover:text-paper"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={!isComplete}
            className="mt-2 w-full rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-charcoal-2 disabled:text-smoke-dim bg-[var(--color-movies)] text-ink hover:brightness-110"
          >
            Roast My Taste
          </button>
          {!isComplete && (
            <p className="text-center text-xs text-smoke-dim">{4 - filledCount} more to go.</p>
          )}
        </form>
      </div>
    </div>
  );
}
