export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Resolve a platform accent token to its CSS var, for inline styles
 * (used where Tailwind's static class extraction can't see dynamic classes). */
export function accentVar(accent: string) {
  return `var(--color-${accent})`;
}
