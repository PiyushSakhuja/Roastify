import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Swap this for Sentry/similar once error tracking is wired up.
    // Never surface `error`/`info` details to the user — dev console only.
    console.error("[Roastify] Unhandled error in component tree:", error, info);
  }

  private handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink px-6 text-center">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke-dim">
            Case dismissed
          </span>
          <h1 className="font-display text-3xl uppercase tracking-tight text-paper sm:text-4xl">
            Something broke the courtroom.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-smoke">
            An unexpected error stopped the page from loading. Try heading back
            to the dashboard.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-full bg-verdict px-6 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Back to dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
