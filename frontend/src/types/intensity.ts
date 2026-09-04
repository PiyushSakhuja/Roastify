/**
 * Roast intensity is a real parameter — it's sent to the backend and changes
 * the AI's system prompt (see backend/providers/prompt.js's
 * INTENSITY_MODIFIERS). This is not a cosmetic label; picking "No Mercy"
 * genuinely produces a harsher roast from the same real data.
 */
export type RoastIntensity = "mild" | "medium" | "no-mercy";

export const INTENSITY_OPTIONS: { id: RoastIntensity; label: string; hint: string }[] = [
  { id: "mild", label: "Mild", hint: "Friendly ribbing" },
  { id: "medium", label: "Medium", hint: "Savage but fair" },
  { id: "no-mercy", label: "No Mercy", hint: "Zero restraint" },
];
