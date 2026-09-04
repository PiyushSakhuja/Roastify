const SENTENCES: Record<string, string[]> = {
  github: [
    "Sentenced to: 3 more years of unfinished side projects.",
    "Sentenced to: mandatory README writing, effective immediately.",
    "Sentenced to: reviewing your own pull requests. Alone.",
    "Sentenced to: no new repos until the old ones are finished.",
  ],
  steam: [
    "Sentenced to: actually starting the backlog. Today.",
    "Sentenced to: explaining the achievement percentage to a jury of your peers.",
    "Sentenced to: one (1) completed playthrough before any new purchases.",
    "Sentenced to: community service in the form of finishing a tutorial level.",
  ],
  valorant: [
    "Sentenced to: aim training, no exceptions, no excuses.",
    "Sentenced to: a full season without an int.",
    "Sentenced to: reviewing the VOD. All of it.",
    "Sentenced to: agent variety. Pick something else.",
  ],
  movies: [
    "Sentenced to: one (1) universally acclaimed film outside your comfort genre.",
    "Sentenced to: no rewatches until the watchlist shrinks.",
    "Sentenced to: defending your ratings in open court.",
    "Sentenced to: a director you've never heard of.",
  ],
};

const FALLBACK = ["Sentenced to: reflection. Lots of it."];

/** Simple deterministic hash so the same roast always gets the same
 * sentence — no Math.random() flicker on re-render, and it feels tied to
 * the actual roast text rather than arbitrary. */
function pickIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % length;
}

interface SentenceLineProps {
  platform: keyof typeof SENTENCES;
  /** Roast text or another stable identifier, used only to deterministically
   * pick a line — never sent anywhere or used as real data. */
  seed: string;
}

/** Exposed so other components (e.g. VerdictCard) can reuse the exact same
 * deterministic pick instead of hardcoding a sentence themselves. */
export function getSentence(platform: keyof typeof SENTENCES, seed: string): string {
  const pool = SENTENCES[platform] ?? FALLBACK;
  return pool[pickIndex(seed, pool.length)];
}

export function SentenceLine({ platform, seed }: SentenceLineProps) {
  return (
    <p className="font-mono text-xs uppercase tracking-wide text-verdict/90">
      {getSentence(platform, seed)}
    </p>
  );
}
