import { useCallback, useRef, useState } from "react";
import { cx } from "../../lib/utils";
import { parseLetterboxdFiles, InvalidLetterboxdFileError, LETTERBOXD_DATA_EXPORT_URL } from "../../integrations/letterboxd";
import type { MovieRoastData } from "../../integrations/movies";

interface LetterboxdUploaderProps {
  onParsed: (data: MovieRoastData) => void;
  onBack: () => void;
}

/**
 * Drag-and-drop + file-picker CSV upload for a Letterboxd data export.
 * Parsing happens fully client-side (see integrations/letterboxd.ts) —
 * nothing is uploaded to any server until the user has a normalized
 * summary ready to roast, and the raw CSV itself is never sent anywhere.
 */
export function LetterboxdUploader({ onParsed, onBack }: LetterboxdUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".csv"));
      if (files.length === 0) {
        setError("That doesn't look like a Letterboxd movie export.");
        return;
      }

      setError(null);
      setIsParsing(true);
      setFileNames(files.map((f) => f.name));

      try {
        const data = await parseLetterboxdFiles(files);
        onParsed(data);
      } catch (err) {
        if (err instanceof InvalidLetterboxdFileError) {
          setError(err.message);
        } else {
          setError("Something went wrong reading that file. Please try again.");
        }
      } finally {
        setIsParsing(false);
      }
    },
    [onParsed]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
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
        <h2 className="mb-1.5 font-display text-xl uppercase tracking-wide text-paper">
          Import your Letterboxd history
        </h2>
        <p className="mb-5 text-sm text-smoke">
          Your CSV is parsed in your browser. We only send a summarized taste profile to generate
          the roast — never the raw file.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cx(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition",
            isDragging ? "border-[var(--color-movies)] bg-[var(--color-movies)]/5" : "border-line hover:border-smoke-dim"
          )}
        >
          <svg viewBox="0 0 24 24" className="mb-3 h-8 w-8 text-smoke" fill="none">
            <path d="M12 4v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7.5 10.5L12 15l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17.5v1.5a2 2 0 002 2h12a2 2 0 002-2v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {isParsing ? (
            <p className="text-sm text-paper">Parsing {fileNames.join(", ")}...</p>
          ) : (
            <>
              <p className="text-sm text-paper">Drop your Letterboxd CSV here</p>
              <p className="mt-1 text-xs text-smoke-dim">or</p>
              <span className="mt-2 rounded-full border border-line px-4 py-1.5 text-xs font-medium text-paper">
                Choose CSV
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-verdict/40 bg-verdict/5 px-3 py-2 text-sm text-verdict">
            {error}
          </p>
        )}

        <p className="mt-4 text-xs text-smoke-dim">
          Accepts diary.csv, ratings.csv, or watched.csv from your Letterboxd export — upload one
          or several at once for a fuller picture.{" "}
          <a
            href={LETTERBOXD_DATA_EXPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="text-smoke underline decoration-smoke-dim underline-offset-2 hover:text-[var(--color-movies)]"
          >
            Don't have your CSV? Get it from Letterboxd &rarr;
          </a>
        </p>
      </div>
    </div>
  );
}
