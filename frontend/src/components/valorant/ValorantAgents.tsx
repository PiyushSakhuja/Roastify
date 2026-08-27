import type { ValorantRoastData } from "../../integrations/valorant";

interface ValorantAgentsProps {
  data: ValorantRoastData;
}

/**
 * Deterministically derives a short "Agent Personality" line from real
 * agent-usage stats — never randomized, never invented. Every branch is
 * gated on an actual numeric threshold from the data.
 */
function deriveAgentPersonality(data: ValorantRoastData): string {
  const { agents, matchesAnalyzed } = data;
  const main = agents[0];
  if (!main || !matchesAnalyzed) return "Not enough matches yet to read your agent tendencies.";

  const mainShare = Math.round((main.games / matchesAnalyzed) * 100);

  if (mainShare >= 80) {
    return `${mainShare}% of your matches are on ${main.name}. That's not a main, that's a hostage situation.`;
  }
  if (agents.length === 1) {
    return `Every recorded match was on ${main.name}. Zero range, maximum commitment.`;
  }
  if (mainShare >= 50) {
    return `${main.name} is your clear main at ${mainShare}% of games, with ${agents[1]?.name ?? "a distant second"} picking up the rest.`;
  }
  return `Your picks are spread across ${agents.length} agents with no single one dominating — flexible, or just indecisive.`;
}

/** Agent DNA — most-used agents, a deterministic personality read, and map performance. */
export function ValorantAgents({ data }: ValorantAgentsProps) {
  const main = data.agents[0];
  const secondary = data.agents[1];
  const personality = deriveAgentPersonality(data);

  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
      <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-valorant)]">
        Agent DNA
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line/70 bg-ink/40 p-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">Main</p>
          <p className="mt-1 font-display text-lg uppercase tracking-wide text-paper">
            {main?.name ?? "—"}
          </p>
          {main && (
            <p className="mt-1 text-xs text-smoke">
              {main.games} games · {main.winRate ?? 0}% win rate
            </p>
          )}
        </div>
        <div className="rounded-xl border border-line/70 bg-ink/40 p-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-wide text-smoke-dim">Secondary</p>
          <p className="mt-1 font-display text-lg uppercase tracking-wide text-paper">
            {secondary?.name ?? "—"}
          </p>
          {secondary && (
            <p className="mt-1 text-xs text-smoke">
              {secondary.games} games · {secondary.winRate ?? 0}% win rate
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-valorant)]/25 bg-[var(--color-valorant)]/5 p-4">
        <p className="mb-1 font-mono text-[0.6rem] uppercase tracking-wide text-[var(--color-valorant)]">
          Your Agent Personality
        </p>
        <p className="text-sm text-paper">{personality}</p>
      </div>

      {data.agents.length > 2 && (
        <ul className="mt-4 space-y-1.5">
          {data.agents.slice(2, 5).map((agent) => (
            <li
              key={agent.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-ink/30 px-3 py-2"
            >
              <span className="truncate text-sm text-paper">{agent.name}</span>
              <span className="shrink-0 font-mono text-xs text-smoke">
                {agent.games}g · {agent.winRate ?? 0}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
