import { Routes, Route } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { SpotifyRoastPage } from "./pages/SpotifyRoastPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/spotify-roast" element={<SpotifyRoastPage />} />
    </Routes>
  );
}
