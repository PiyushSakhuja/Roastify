import { useCallback, useEffect, useState } from "react";
import {
  initiateValorantLogin,
  parseValorantCallback,
  clearCallbackParams,
  completeValorantRoastFlow,
  getValorantRoast,
  ValorantNotConfiguredError,
  ValorantSessionExpiredError,
  type ValorantRoastData,
} from "../integrations/valorant";
import type { RoastIntensity } from "../types/intensity";

export type ValorantFlowStatus =
  | "idle"
  | "authenticating"
  | "generating-roast"
  | "done"
  | "not-configured"
  | "denied"
  | "session-expired"
  | "error";

interface ValorantFlowState {
  status: ValorantFlowStatus;
  roastText: string | null;
  profile: ValorantRoastData | null;
  sessionId: string | null;
  provider: string | null;
  errorMessage: string | null;
}

const initialState: ValorantFlowState = {
  status: "idle",
  roastText: null,
  profile: null,
  sessionId: null,
  provider: null,
  errorMessage: null,
};

/**
 * Manages the VALORANT RSO OAuth + roast flow. On mount, checks whether
 * we've just been redirected back from the backend's /api/valorant/callback
 * (either ?session=... on success, or ?error=/&error_description= on
 * denial/failure) and, if so, completes the flow automatically. Mirrors
 * useGitHubRoast's structure — the key difference is the backend, not this
 * hook, owns CSRF-state validation and the code exchange.
 */
export function useValorantRoast() {
  const [state, setState] = useState<ValorantFlowState>(initialState);
  const [intensity, setIntensity] = useState<RoastIntensity>("medium");

  useEffect(() => {
    const { sessionId, error, errorDescription } = parseValorantCallback();
    if (!sessionId && !error) return; // Not a callback redirect.

    clearCallbackParams();

    if (error) {
      const status: ValorantFlowStatus = error === "USER_DENIED" ? "denied" : "error";
      setState({
        ...initialState,
        status,
        errorMessage: errorDescription || "Riot authentication failed. Please try again.",
      });
      return;
    }

    if (!sessionId) return;

    setState({ ...initialState, status: "authenticating" });

    completeValorantRoastFlow(sessionId, undefined, intensity)
      .then(({ roastText, provider, profile }) => {
        setState({
          status: "done",
          roastText,
          profile,
          sessionId,
          provider: provider ?? null,
          errorMessage: null,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof ValorantNotConfiguredError) {
          setState({ ...initialState, status: "not-configured", errorMessage: err.message });
          return;
        }
        if (err instanceof ValorantSessionExpiredError) {
          setState({ ...initialState, status: "session-expired", errorMessage: err.message });
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        setState({ ...initialState, status: "error", errorMessage: message });
      });
    // Deliberately runs once on mount only (OAuth callback handling) — the
    // captured `intensity` is whatever was selected before clicking Connect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(() => {
    try {
      initiateValorantLogin();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ ...initialState, status: "error", errorMessage: message });
    }
  }, []);

  const regenerate = useCallback(
    async (provider?: string, overrideIntensity?: RoastIntensity) => {
      if (!state.sessionId) return;
      setState((prev) => ({ ...prev, status: "generating-roast" }));
      try {
        const { roastText, provider: usedProvider, profile } = await getValorantRoast(
          state.sessionId,
          provider,
          overrideIntensity || intensity
        );
        setState((prev) => ({
          ...prev,
          status: "done",
          roastText,
          profile,
          provider: usedProvider ?? null,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState((prev) => ({ ...prev, status: "error", errorMessage: message }));
      }
    },
    [state.sessionId, intensity]
  );

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, connect, regenerate, reset, intensity, setIntensity };
}
