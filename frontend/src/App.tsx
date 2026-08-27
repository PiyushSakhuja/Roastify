import { Routes, Route } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { SpotifyRoastPage } from "./pages/SpotifyRoastPage";
import { SteamRoastPage } from "./pages/SteamRoast";
import { GitHubRoastPage } from "./pages/GitHubRoast";
import { MovieRoastPage } from "./pages/MovieRoast";
import { ValorantRoastPage } from "./pages/ValorantRoast";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/spotify-roast" element={<SpotifyRoastPage />} />
      <Route path="/steam-roast" element={<SteamRoastPage />} />
      <Route path="/github-roast" element={<GitHubRoastPage />} />
      <Route path="/movie-roast" element={<MovieRoastPage />} />
      <Route path="/valorant-roast" element={<ValorantRoastPage />} />
    </Routes>
  );
}
