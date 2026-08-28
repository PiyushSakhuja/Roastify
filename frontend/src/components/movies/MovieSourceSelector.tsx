import { useEffect, useState } from "react";
import { fetchMovieProviderConfig } from "../../integrations/movies";
import { LETTERBOXD_DATA_EXPORT_URL } from "../../integrations/letterboxd";

export type MovieSourceChoice = "trakt" | "letterboxd" | "top4";

interface MovieSourceSelectorProps {
  onSelect: (source: MovieSourceChoice) => void;
}

/**
 * "How do you want to be judged?" — the entry screen for /movie-roast.
 * All three sources are presented as equally legitimate features; Trakt
 * shows an "unavailable" note (never hidden) if the server doesn't have
 * TRAKT_CLIENT_ID configured, mirroring how VALORANT reports itself as
 * "being configured" rather than pretending to work.
 */
export function MovieSourceSelector({ onSelect }: MovieSourceSelectorProps) {
  const [traktConfigured, setTraktConfigured] = useState(true);

  useEffect(() => {
    fetchMovieProviderConfig().then((cfg) => setTraktConfigured(cfg.traktConfigured));
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl uppercase tracking-tight text-paper sm:text-3xl">
          How do you want to be judged?
        </h1>
        <p className="mt-2 text-sm text-smoke">Give Roastify some evidence. We'll do the rest.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SourceCard
          icon={<TraktGlyph />}
          title="Trakt"
          description="Automatically analyze your movie history, ratings and watching habits."
          cta="Connect Trakt"
          disabled={!traktConfigured}
          note={!traktConfigured ? "Trakt connection unavailable" : undefined}
          onClick={() => onSelect("trakt")}
        />
        <SourceCard
          icon={<LetterboxdGlyph />}
          title="Letterboxd"
          description="Download your Letterboxd data and let us investigate your entire movie history."
          cta="Import CSV"
          onClick={() => onSelect("letterboxd")}
          footer={
            <a
              href={LETTERBOXD_DATA_EXPORT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-block text-xs text-smoke underline decoration-smoke-dim underline-offset-2 hover:text-[var(--color-movies)]"
            >
              Don't have your CSV? Get it from Letterboxd &rarr;
            </a>
          }
        />
        <SourceCard
          icon={<Top4Glyph />}
          title="Top 4"
          description="No account. No API. No excuses."
          cta="Enter My Top 4"
          onClick={() => onSelect("top4")}
        />
      </div>
    </div>
  );
}

function SourceCard({
  icon,
  title,
  description,
  cta,
  onClick,
  disabled,
  note,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  note?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-charcoal/80 p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-[var(--color-movies)]/10 text-[var(--color-movies)]">
        {icon}
      </div>
      <h3 className="font-display text-base uppercase tracking-wide text-paper">{title}</h3>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-smoke">{description}</p>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-charcoal-2 disabled:text-smoke-dim bg-[var(--color-movies)] text-ink hover:brightness-110"
      >
        {cta}
      </button>
      {note && <p className="mt-2 text-center font-mono text-[0.6rem] uppercase tracking-wide text-verdict">{note}</p>}
      {footer}
    </div>
  );
}

function TraktGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function LetterboxdGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <circle cx="7" cy="12" r="4" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="17" cy="12" r="4" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.3" opacity="0.6" />
    </svg>
  );
}

function Top4Glyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
