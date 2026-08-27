import { useCallback, useState } from "react";
import {
  fetchSteamData,
  getRoastFromBackend,
  SteamPrivateProfileError,
  type SteamRoastData,
} from "../integrations/steam";

export type SteamFlowStatus =
  | "idle"
  | "fetching-profile"
  | "generating-roast"
  | "done"
  | "private"
  | "error";

interface SteamFlowState {
  status: SteamFlowStatus;
  roastText: string | null;
  steamData: SteamRoastData | null;
  provider: string | null;
  errorMessage: string | null;
}

const initialState: SteamFlowState = {
  status: "idle",
  roastText: null,
  steamData: null,
  provider: null,
  errorMessage: null,
};

/**
 * Manages the Steam Roast flow: resolve profile -> fetch real Steam data ->
 * generate a roast. No OAuth redirect involved (unlike Spotify), so this is
 * simpler and entirely driven by explicit calls rather than a mount-time
 * callback check.
 */
export function useSteamRoast() {
  const [state, setState] = useState<SteamFlowState>(initialState);

  const connect = useCallback(async (profileInput: string, provider?: string) => {
    setState({ ...initialState, status: "fetching-profile" });
    try {
      const steamData = await fetchSteamData(profileInput);
      setState((prev) => ({ ...prev, status: "generating-roast", steamData }));

      const { roastText, provider: usedProvider, steamData: finalData } =
        await getRoastFromBackend(steamData, provider);

      setState({
        status: "done",
        roastText,
        steamData: finalData,
        provider: usedProvider ?? null,
        errorMessage: null,
      });
    } catch (err) {
      if (err instanceof SteamPrivateProfileError) {
        setState({ ...initialState, status: "private", errorMessage: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setState({ ...initialState, status: "error", errorMessage: message });
    }
  }, []);

  const regenerate = useCallback(
    async (provider?: string) => {
      if (!state.steamData) return;
      setState((prev) => ({ ...prev, status: "generating-roast" }));
      try {
        const { roastText, provider: usedProvider } = await getRoastFromBackend(
          state.steamData,
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
    [state.steamData]
  );

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, connect, regenerate, reset };
}
