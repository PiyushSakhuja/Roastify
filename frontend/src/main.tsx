import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./runtimeConfig";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConfigWarningBanner } from "./components/ConfigWarningBanner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Renders nothing unless VITE_BACKEND_URL was never set at build
          time. Lives outside <App /> so it never touches any page's own
          layout — including /spotify-roast, which must render unchanged. */}
      <ConfigWarningBanner />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
