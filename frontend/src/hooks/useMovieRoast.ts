import { useCallback, useState } from "react";
import {
  fetchMovieData,
  getRoastFromBackend,
  MovieProfilePrivateError,
  MovieProfileNotFoundError,
  MovieEmptyHistoryError,
  type MovieRoastData,
} from "../integrations/movies";

export type MovieFlowStatus =
  | "idle"
  | "fetching-profile"
  | "generating-roast"
  | "done"
  | "private"
  | "not-found"
  | "empty"
  | "error";

interface MovieFlowState {
  status: MovieFlowStatus;
  roastText: string | null;
  movieData: MovieRoastData | null;
  provider: string | null;
  errorMessage: string | null;
}

const initialState: MovieFlowState = {
  status: "idle",
  roastText: null,
  movieData: null,
  provider: null,
  errorMessage: null,
};

/**
 * Manages the Movie Roast flow: resolve profile -> fetch real Trakt watch
 * history -> generate a roast. No OAuth redirect involved (unlike Spotify
 * and GitHub), so this is simpler and entirely driven by explicit calls —
 * mirrors useSteamRoast.
 */
export function useMovieRoast() {
  const [state, setState] = useState<MovieFlowState>(initialState);

  const connect = useCallback(async (profileInput: string, provider?: string) => {
    setState({ ...initialState, status: "fetching-profile" });
    try {
      const movieData = await fetchMovieData(profileInput);
      setState((prev) => ({ ...prev, status: "generating-roast", movieData }));

      const { roastText, provider: usedProvider, movieData: finalData } =
        await getRoastFromBackend(movieData, provider);

      setState({
        status: "done",
        roastText,
        movieData: finalData,
        provider: usedProvider ?? null,
        errorMessage: null,
      });
    } catch (err) {
      if (err instanceof MovieProfilePrivateError) {
        setState({ ...initialState, status: "private", errorMessage: err.message });
        return;
      }
      if (err instanceof MovieProfileNotFoundError) {
        setState({ ...initialState, status: "not-found", errorMessage: err.message });
        return;
      }
      if (err instanceof MovieEmptyHistoryError) {
        setState({ ...initialState, status: "empty", errorMessage: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setState({ ...initialState, status: "error", errorMessage: message });
    }
  }, []);

  /**
   * For sources that normalize entirely client-side (Letterboxd CSV, Top4)
   * — skips the fetch step and goes straight to the roast, since the data
   * is already in hand.
   */
  const connectWithData = useCallback(async (movieData: MovieRoastData, provider?: string) => {
    setState({ ...initialState, status: "generating-roast", movieData });
    try {
      const { roastText, provider: usedProvider, movieData: finalData } =
        await getRoastFromBackend(movieData, provider);

      setState({
        status: "done",
        roastText,
        movieData: finalData,
        provider: usedProvider ?? null,
        errorMessage: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ ...initialState, status: "error", errorMessage: message });
    }
  }, []);

  const regenerate = useCallback(
    async (provider?: string) => {
      if (!state.movieData) return;
      setState((prev) => ({ ...prev, status: "generating-roast" }));
      try {
        const { roastText, provider: usedProvider } = await getRoastFromBackend(
          state.movieData,
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
    [state.movieData]
  );

  const reset = useCallback(() => setState(initialState), []);

  return { ...state, connect, connectWithData, regenerate, reset };
}
