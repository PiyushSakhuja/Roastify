import { useState, type FormEvent } from "react";
import { cx } from "../../lib/utils";

interface SteamStatsProps {
  onSubmit: (profileInput: string) => void;
  disabled?: boolean;
}

/** Connection form — enter a Steam profile URL, vanity name, or SteamID64. */
export function SteamStats({ onSubmit, disabled }: SteamStatsProps) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const isValid = value.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="steam-profile-input" className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-smoke">
        Steam profile
      </label>
      <input
        id="steam-profile-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="steamcommunity.com/id/yourname"
        disabled={disabled}
        className={cx(
          "w-full rounded-xl border bg-ink/50 px-4 py-3 text-sm text-paper placeholder:text-smoke-dim transition",
          "focus:outline-none focus:border-[var(--color-steam)]",
          touched && !isValid ? "border-verdict/60" : "border-line"
        )}
      />
      {touched && !isValid && (
        <p className="mt-1.5 text-xs text-verdict">Enter a profile URL, vanity name, or SteamID64.</p>
      )}
      <p className="mt-2 text-xs text-smoke-dim">
        Accepts a full URL (steamcommunity.com/id/yourname), a vanity name, or a 17-digit SteamID64.
      </p>

      <button
        type="submit"
        disabled={disabled}
        className={cx(
          "mt-4 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition",
          disabled
            ? "cursor-not-allowed bg-charcoal-2 text-smoke-dim"
            : "bg-[var(--color-steam)] text-ink hover:brightness-110"
        )}
      >
        Connect & Roast
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
