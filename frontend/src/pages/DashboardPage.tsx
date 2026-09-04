import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { PlatformSection } from "../components/PlatformSection";
import { Footer } from "../components/Footer";
import { platforms } from "../data/platforms";

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-ink">
      <div className="grain" />
      <Navbar />
      <main>
        <Hero />
        <PlatformSection platforms={platforms} />
      </main>
      <Footer />
    </div>
  );
}
