import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { PlatformSection } from "../components/PlatformSection";
import { CombinedRoastCard } from "../components/CombinedRoastCard";
import { RoastModal } from "../components/RoastModal";
import { Footer } from "../components/Footer";
import { platforms as initialPlatforms } from "../data/platforms";
import type { Platform } from "../types/platform";

export function DashboardPage() {
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [activeRoast, setActiveRoast] = useState<Platform | null>(null);
  const navigate = useNavigate();

  const connectedPlatforms = useMemo(
    () => platforms.filter((p) => p.connectionState === "connected"),
    [platforms]
  );

  function handleConnect(id: string) {
    if (id === "spotify") {
      // Spotify doesn't connect in-place — it's a real in-app route that
      // owns the actual OAuth login + token exchange (and is the exact URL
      // registered as the Spotify app's redirect URI).
      navigate("/spotify-roast");
      return;
    }
     if (id === "github") {
      // Same pattern as Spotify — a real in-app route owns the actual
      // GitHub OAuth flow (and is the exact callback URL registered on
      // the GitHub OAuth App).
      navigate("/github-roast");
      return;
    }
    if (id === "steam") {
      // Steam has a real backend integration too — its own route owns the
      // profile-connection form and the live Steam Web API data fetch.
      navigate("/steam-roast");
      return;
    }
    if (id === "movies") {
      // Movies has a real backend integration too — its own route owns the
      // Trakt profile-connection form and the live Trakt API data fetch.
      navigate("/movie-roast");
      return;
    }
    if (id === "valorant") {
      // VALORANT has a real backend integration too — its own route owns
      // the Riot Sign On flow and the live Riot API data fetch.
      navigate("/valorant-roast");
      return;
    }
    // Other platforms don't have a live backend integration yet; connecting
    // here just flips the mock state so the rest of the dashboard (combined
    // roast, filters) can be exercised with realistic data in the meantime.
    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, connectionState: "connected" } : p
      )
    );
  }

  function handleRoast(id: string) {
    if (id === "spotify") {
      navigate("/spotify-roast");
      return;
    }
    if (id === "steam") {
      navigate("/steam-roast");
      return;
    }
    if (id === "github") {
      navigate("/github-roast");
      return;
    }
    if (id === "movies") {
      navigate("/movie-roast");
      return;
    }
    if (id === "valorant") {
      navigate("/valorant-roast");
      return;
    }

    const platform = platforms.find((p) => p.id === id);
    if (!platform) return;
    setActiveRoast(platform);
  }

  return (
    <div className="min-h-screen bg-ink">
      <div className="grain" />
      <Navbar />
      <main>
        <Hero />
        <PlatformSection
          platforms={platforms}
          onConnect={handleConnect}
          onRoast={handleRoast}
        />
        <div className="mx-auto max-w-7xl px-6 pb-24">
          <CombinedRoastCard connectedPlatforms={connectedPlatforms} />
        </div>
      </main>
      <Footer />
      <RoastModal platform={activeRoast} onClose={() => setActiveRoast(null)} />
    </div>
  );
}
