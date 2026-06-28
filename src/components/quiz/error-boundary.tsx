"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  /** Optional custom fallback UI. If omitted, the default error card is used. */
  fallback?: ReactNode;
  /** Children to wrap — any thrown error in this subtree is caught. */
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — React class-based error boundary.
 *
 * Catches JavaScript errors anywhere in its child component tree, logs them
 * to the console (and could later forward to Sentry/Datadog/Logflare), and
 * renders a friendly fallback UI with a "Recharger" button.
 *
 * React still requires error boundaries to be class components — function
 * components cannot implement getDerivedStateFromError / componentDidCatch.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <RiskyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // Log to the console for development. In production this is where we'd
    // forward to an error-monitoring service (Sentry, Datadog, etc.).
    // The task description mentions "could send to Sentry later" — so we keep
    // the integration point explicit.
    console.error("[ErrorBoundary] Caught error:", error, info);

    // Future: Sentry.captureException(error, { contexts: { react: info } });
  }

  private handleReload = (): void => {
    // Hard reload — the simplest, most reliable way to recover from a render
    // error in a deeply-nested component.
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const message =
        this.state.error?.message || "Une erreur inattendue s'est produite.";

      return (
        <div
          role="alert"
          className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/50 dark:bg-rose-950/30"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50">
            <AlertTriangle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">
              Oups, une erreur est survenue
            </h2>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button
            onClick={this.handleReload}
            className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
          >
            <RotateCcw className="h-4 w-4" />
            Recharger
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withErrorBoundary — HOC pour envelopper un composant avec ErrorBoundary.
 *
 * Usage :
 *   export default withErrorBoundary(MyComponent);
 *   // ou avec options :
 *   export default withErrorBoundary(MyComponent, { onReset: ... });
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, "children">
): React.ComponentType<P> {
  const Wrapped = (props: P) => (
    <ErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
}
