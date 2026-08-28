// src/integrations/letterboxd.ts
//
// Letterboxd CSV import. Letterboxd has no public API for this kind of
// bulk personal data, and we're explicitly told not to scrape or require
// OAuth — so the supported path is Letterboxd's own official data export
// (https://letterboxd.com/settings/data/), which the user downloads
// themselves and uploads here. Parsing happens entirely in the browser;
// the raw CSV never leaves the client, and only the normalized summary
// (not the raw rows) is sent to the backend for roasting.
//
// Letterboxd's export zip contains several possible CSVs depending on
// what the user has used the site for (diary.csv, ratings.csv,
// watched.csv, reviews.csv, watchlist.csv). We don't assume a single
// fixed shape — we sniff the header row and adapt.

import type { Movie, MovieRoastData } from "./movies";

export const LETTERBOXD_DATA_EXPORT_URL = "https://letterboxd.com/settings/data/";

export class InvalidLetterboxdFileError extends Error {
  constructor(message = "That doesn't look like a Letterboxd movie export.") {
    super(message);
    this.name = "InvalidLetterboxdFileError";
  }
}

interface RawRow {
  [column: string]: string;
}

/** Minimal RFC 4180-ish CSV parser — handles quoted fields, escaped quotes, and commas inside quotes. No external dependency needed for Letterboxd's fairly simple export format. */
function parseCsv(text: string): RawRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM if present (common in exported CSVs).
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // skip; \n handles the line break
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim().length > 0));
  if (nonEmptyRows.length < 1) return [];

  const header = nonEmptyRows[0].map((h) => h.trim().toLowerCase());
  return nonEmptyRows.slice(1).map((cells) => {
    const record: RawRow = {};
    header.forEach((key, idx) => {
      record[key] = (cells[idx] ?? "").trim();
    });
    return record;
  });
}

/**
 * Letterboxd exports use a handful of known header shapes across diary,
 * ratings, and watched-history CSVs. We recognize a file as "Letterboxd"
 * if the header contains a "name" (title) column plus at least one of the
 * columns Letterboxd is known to use — this avoids false positives on
 * unrelated CSVs while tolerating the different export variants.
 */
function looksLikeLetterboxdExport(rows: RawRow[]): boolean {
  if (rows.length === 0) return false;
  const columns = Object.keys(rows[0]);
  const hasTitle = columns.includes("name") || columns.includes("title");
  const hasLetterboxdSignal = [
    "letterboxd uri",
    "uri",
    "watched date",
    "date",
    "rating",
    "year",
  ].some((c) => columns.includes(c));
  return hasTitle && hasLetterboxdSignal;
}

function parseYear(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 1870 && n < 2100 ? n : undefined;
}

/** Letterboxd ratings are 0.5–5 stars; normalize to Roastify's existing 0–10 scale used by Trakt data. */
function parseRatingToTenScale(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 2 * 10) / 10; // 4.5 stars -> 9
}

function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

interface ParsedLetterboxdMovie {
  title: string;
  year?: number;
  rating?: number;
  watchedDate?: string;
  tmdbId?: string;
  imdbId?: string;
}

function extractMovies(rows: RawRow[]): ParsedLetterboxdMovie[] {
  return rows
    .map((row): ParsedLetterboxdMovie | null => {
      const title = row["name"] || row["title"];
      if (!title) return null;
      return {
        title,
        year: parseYear(row["year"]),
        rating: parseRatingToTenScale(row["rating"]),
        watchedDate: parseDate(row["watched date"] || row["date"]),
        tmdbId: row["tmdb id"] || undefined,
        imdbId: row["imdb id"] || undefined,
      };
    })
    .filter((m): m is ParsedLetterboxdMovie => m !== null);
}

function decadeOf(year: number | undefined): string | undefined {
  if (!year) return undefined;
  return `${Math.floor(year / 10) * 10}s`;
}

/**
 * Normalizes one or more parsed Letterboxd CSVs (a user may upload
 * diary.csv, ratings.csv, and/or watched.csv) into the shared
 * MovieRoastData shape. Movies are de-duplicated by title+year, merging
 * rating/watched-date info when the same film appears in multiple files
 * (e.g. rated in ratings.csv, watched date only in diary.csv).
 */
function buildNormalizedData(allMovies: ParsedLetterboxdMovie[]): MovieRoastData {
  const byKey = new Map<string, ParsedLetterboxdMovie>();
  for (const m of allMovies) {
    const key = `${m.title.toLowerCase()}::${m.year ?? "?"}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, m);
    } else {
      byKey.set(key, {
        title: existing.title,
        year: existing.year ?? m.year,
        rating: existing.rating ?? m.rating,
        watchedDate: existing.watchedDate ?? m.watchedDate,
        tmdbId: existing.tmdbId ?? m.tmdbId,
        imdbId: existing.imdbId ?? m.imdbId,
      });
    }
  }

  const deduped = [...byKey.values()];
  // No genre/director/actor data is available from Letterboxd's CSV export
  // itself (no TMDB enrichment configured in this project) — so those
  // fields are correctly left empty rather than invented.
  const movies: Movie[] = deduped.map((m) => ({
    title: m.title,
    year: m.year,
    rating: m.rating,
    genres: [],
    watchedDate: m.watchedDate,
  }));

  const decadeCounts: Record<string, number> = {};
  const ratingValues: number[] = [];
  for (const m of movies) {
    const decade = decadeOf(m.year);
    if (decade) decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
    if (typeof m.rating === "number") ratingValues.push(m.rating);
  }

  const favoriteDecades = Object.entries(decadeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);

  const averageRating =
    ratingValues.length > 0
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
      : undefined;

  const recentMovies = [...movies]
    .filter((m) => m.watchedDate)
    .sort((a, b) => (b.watchedDate! > a.watchedDate! ? 1 : -1))
    .slice(0, 10)
    .map((m) => m.title);

  const highRatingCount = ratingValues.filter((r) => r >= 8).length;
  const preNewCutoff = new Date().getFullYear() - 15;
  const oldCount = movies.filter((m) => m.year && m.year < preNewCutoff).length;
  const newCount = movies.filter((m) => m.year && m.year >= preNewCutoff).length;

  const topRated = [...movies]
    .filter((m) => typeof m.rating === "number")
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5)
    .map((m) => ({ title: m.title, rating: m.rating }));

  return {
    source: "letterboxd",
    totalMovies: movies.length,
    movies,
    topGenres: [], // Not derivable from the CSV alone; UI hides this section when empty.
    topDirectors: [],
    topActors: [],
    averageRating,
    favoriteDecades,
    recentMovies: recentMovies.length ? recentMovies : undefined,
    evidence: {
      highRatingCount,
      highRatingPercent: ratingValues.length ? Math.round((highRatingCount / ratingValues.length) * 100) : undefined,
      oldMoviePercent: movies.length ? Math.round((oldCount / movies.length) * 100) : undefined,
      newMoviePercent: movies.length ? Math.round((newCount / movies.length) * 100) : undefined,
      topRated: topRated.length ? topRated : undefined,
    },
  };
}

/**
 * Parses one or more uploaded Letterboxd export CSVs (diary/ratings/watched)
 * and returns the normalized MovieRoastData. Throws InvalidLetterboxdFileError
 * if none of the provided files resemble a Letterboxd export.
 */
export async function parseLetterboxdFiles(files: File[]): Promise<MovieRoastData> {
  const allMovies: ParsedLetterboxdMovie[] = [];
  let anyRecognized = false;

  for (const file of files) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (!looksLikeLetterboxdExport(rows)) continue;
    anyRecognized = true;
    allMovies.push(...extractMovies(rows));
  }

  if (!anyRecognized) {
    throw new InvalidLetterboxdFileError();
  }
  if (allMovies.length === 0) {
    throw new InvalidLetterboxdFileError("That export looks like Letterboxd data, but no movies were found in it.");
  }

  return buildNormalizedData(allMovies);
}
