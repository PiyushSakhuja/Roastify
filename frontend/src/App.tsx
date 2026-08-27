import { Routes, Route } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { SpotifyRoastPage } from "./pages/SpotifyRoastPage";
import { SteamRoastPage } from "./pages/SteamRoast";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/spotify-roast" element={<SpotifyRoastPage />} />
      <Route path="/steam-roast" element={<SteamRoastPage />} />
    </Routes>
  );
}
