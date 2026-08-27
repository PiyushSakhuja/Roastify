import { useMemo, useState } from "react";
import type { SteamRoastData } from "../../integrations/steam";
import { cx } from "../../lib/utils";

interface SteamLibraryProps {
  data: SteamRoastData;
}

type SortMode = "playtime" | "recent" | "name";

const SORT_LABELS: Record<SortMode, string> = {
  playtime: "Most played",
  recent: "Recently played",
  name: "A – Z",
};

/** Expandable, searchable, sortable game library. Collapsed by default — never dumps hundreds of games at once. */
export function SteamLibrary({ data }: SteamLibraryProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("playtime");

  const library = data.library ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? library.filter((g) => g.name.toLowerCase().includes(q)) : library;

    list = [...list];
    if (sort === "playtime") {
      list.sort((a, b) => b.playtimeHours - a.playtimeHours);
    } else if (sort === "recent") {
      list.sort((a, b) => b.playtimeRecentHours - a.playtimeRecentHours);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [library, query, sort]);

  if (library.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-steam)]">
            Game library
          </p>
          <h3 className="mt-1 font-display text-lg uppercase tracking-wide text-paper">
            {library.length} games on file
          </h3>
        </div>
        <span
          className={cx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-smoke transition-transform",
            expanded && "rotate-180"
          )}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="mt-5">
          <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library..."
              className="w-full flex-1 rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-paper placeholder:text-smoke-dim focus:outline-none focus:border-[var(--color-steam)]"
            />
            <div className="flex gap-1.5">
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSort(mode)}
                  className={cx(
                    "rounded-full border px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wide transition",
                    sort === mode
                      ? "border-[var(--color-steam)] bg-[var(--color-steam)]/10 text-paper"
                      : "border-line text-smoke hover:text-paper"
                  )}
                >
                  {SORT_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-smoke-dim">No games match your search.</p>
            ) : (
              filtered.map((game) => (
                <div
                  key={game.appid}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-ink/30 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {game.iconUrl && (
                      <img
                        src={game.iconUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 rounded object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                    )}
                    <span className="truncate text-sm text-paper">{game.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-smoke">
                    {Math.round(game.playtimeHours)}h
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
