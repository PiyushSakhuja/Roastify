import { useCallback, useEffect, useState } from "react";
import {
  initiateSpotifyLogin,
  parseSpotifyCallback,
  clearCallbackParams,
  clearStoredAuthState,
  completeSpotifyRoastFlow,
  getRoastFromBackend,
  type SpotifyRoastData,
} from "../integrations/spotify";

export type SpotifyFlowStatus =
  | "idle"
  | "authenticating"
  | "generating-roast"
  | "done"
  | "error";

interface SpotifyFlowState {
  status: SpotifyFlowStatus;
  roastText: string | null;
  spotifyData: SpotifyRoastData | null;
  provider: string | null;
  errorMessage: string | null;
}

const initialState: SpotifyFlowState = {
  status: "idle",
  roastText: null,
  spotifyData: null,
  provider: null,
  errorMessage: null,
};

/**
 * Manages the real Spotify OAuth + roast flow (backed by the Roastify
 * backend's /api/token-exchange and /api/generate-roast endpoints).
 * On mount, checks if we've just been redirected back from Spotify with
 * an authorization code, and if so, runs the full flow automatically.
 */
export function useSpotifyRoast() {
  const [state, setState] = useState<SpotifyFlowState>(initialState);

  useEffect(() => {
    const { code, error, errorDescription, stateValid } = parseSpotifyCallback();
    if (!code && !error) return; // Not a callback redirect — nothing to do.

    clearCallbackParams();

    if (error) {
      setState({
        ...initialState,
        status: "error",
        errorMessage: `Spotify authentication failed: ${errorDescription || "User denied access or an unknown error occurred."}`,
      });
      return;
    }

    if (!code || !stateValid) {
      setState({
        ...initialState,
        status: "error",
        errorMessage: "Authentication failed due to a state mismatch. Please try logging in again.",
      });
      return;
    }

    setState({ ...initialState, status: "authenticating" });

    completeSpotifyRoastFlow(code)
      .then(({ spotifyData, roastText, provider }) => {
        setState({
          status: "done",
          roastText,
          spotifyData,
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

  const login = useCallback(() => {
    initiateSpotifyLogin();
  }, []);

  const regenerate = useCallback(
    async (provider?: string) => {
      if (!state.spotifyData) return;
      setState((prev) => ({ ...prev, status: "generating-roast" }));
      try {
        const { roastText, provider: usedProvider } = await getRoastFromBackend(
          state.spotifyData,
          provider
        );
        setState((prev) => ({
          ...prev,
          status: "done",
          roastText,
          provider: usedProvider ?? null,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState((prev) => ({ ...prev, status: "error", errorMessage: message }));
      }
    },
    [state.spotifyData]
  );

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, login, regenerate, reset };
}
