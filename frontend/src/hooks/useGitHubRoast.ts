import { useCallback, useEffect, useState } from "react";
import {
  initiateGitHubLogin,
  parseGitHubCallback,
  clearCallbackParams,
  clearStoredAuthState,
  completeGitHubRoastFlow,
  getGitHubRoast,
} from "../integrations/github";
import type { GitHubRoastData } from "../types/github";

export type GitHubFlowStatus =
  | "idle"
  | "authenticating"
  | "generating-roast"
  | "done"
  | "error";

interface GitHubFlowState {
  status: GitHubFlowStatus;
  roastText: string | null;
  profile: GitHubRoastData | null;
  sessionId: string | null;
  provider: string | null;
  errorMessage: string | null;
}

const initialState: GitHubFlowState = {
  status: "idle",
  roastText: null,
  profile: null,
  sessionId: null,
  provider: null,
  errorMessage: null,
};

/**
 * Manages the real GitHub OAuth + roast flow (backed by the Roastify
 * backend's /api/github/token-exchange and /api/github/roast endpoints).
 * On mount, checks if we've just been redirected back from GitHub with an
 * authorization code, and if so, runs the full flow automatically.
 *
 * Mirrors useSpotifyRoast.ts's structure exactly — same status machine,
 * same effect-on-mount pattern, same regenerate-without-relogin behavior.
 */
export function useGitHubRoast() {
  const [state, setState] = useState<GitHubFlowState>(initialState);

  useEffect(() => {
    const { code, error, errorDescription, stateValid } = parseGitHubCallback();
    if (!code && !error) return; // Not a callback redirect — nothing to do.

    clearCallbackParams();

    if (error) {
      setState({
        ...initialState,
        status: "error",
        errorMessage: `GitHub authentication failed: ${errorDescription || "User denied access or an unknown error occurred."}`,
      });
      return;
    }

    if (!code || !stateValid) {
      setState({
        ...initialState,
        status: "error",
        errorMessage: "Authentication failed due to a state mismatch. Please try connecting again.",
      });
      return;
    }

    setState({ ...initialState, status: "authenticating" });

    completeGitHubRoastFlow(code)
      .then(({ sessionId, roastText, provider, profile }) => {
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
        const message = err instanceof Error ? err.message : String(err);
        setState({ ...initialState, status: "error", errorMessage: message });
      })
      .finally(() => {
        clearStoredAuthState();
      });
  }, []);

  const connect = useCallback(() => {
    initiateGitHubLogin();
  }, []);

  const regenerate = useCallback(
    async (provider?: string) => {
      if (!state.sessionId) return;
      setState((prev) => ({ ...prev, status: "generating-roast" }));
      try {
        const { roastText, provider: usedProvider, profile } = await getGitHubRoast(
          state.sessionId,
          provider
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
    [state.sessionId]
  );

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, connect, regenerate, reset };
}
