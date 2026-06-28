"use client";

<<<<<<< Updated upstream
import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  /** Optional custom fallback UI. If omitted, the default error card is used. */
  fallback?: ReactNode;
  /** Children to wrap — any thrown error in this subtree is caught. */
  children: ReactNode;
=======
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  /** Contenu à protéger par la boundary. */
  children: React.ReactNode;
  /** Fallback optionnel personnalisé. */
  fallback?: React.ReactNode;
  /** Callback appelé quand une erreur est capturée. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Callback appelé quand l'utilisateur clique sur "Recharger". */
  onReset?: () => void;
>>>>>>> Stashed changes
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
<<<<<<< Updated upstream
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
=======
 * ErrorBoundary — capturée les erreurs React dans l'arbre enfant,
 * affiche une UI de repli avec un bouton "Recharger" et logge
 * l'erreur dans la console.
 *
 * Utilisation :
 *   <ErrorBoundary>
 *     <MonComplet />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<
>>>>>>> Stashed changes
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
<<<<<<< Updated upstream
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
=======
    // Met à jour le state pour que le prochain rendu affiche le fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Logge l'erreur dans la console (et pourrait l'envoyer à un service
    // type Sentry à l'avenir).
    console.error("[ErrorBoundary] Erreur capturée :", error);
    if (info?.componentStack) {
      console.error("[ErrorBoundary] Composant :", info.componentStack);
    }
    // Propage au callback externe si fourni.
    this.props.onError?.(error, info);
  }

  handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    // Recharge la page courante
>>>>>>> Stashed changes
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

<<<<<<< Updated upstream
  render(): ReactNode {
    if (this.state.hasError) {
=======
  handleGoHome = (): void => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Fallback personnalisé fourni par l'appelant
>>>>>>> Stashed changes
      if (this.props.fallback) {
        return this.props.fallback;
      }

<<<<<<< Updated upstream
      const message =
        this.state.error?.message || "Une erreur inattendue s'est produite.";
=======
      const errorMessage =
        this.state.error?.message ?? "Une erreur inattendue s'est produite.";
>>>>>>> Stashed changes

      return (
        <div
          role="alert"
<<<<<<< Updated upstream
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
=======
          className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Une erreur est survenue</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {errorMessage}
            </p>
            <p className="text-xs text-muted-foreground/70">
              L&apos;équipe a été notifiée. Vous pouvez recharger la page ou
              retourner à l&apos;accueil.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={this.handleReload}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Recharger
            </Button>
            <Button
              variant="outline"
              onClick={this.handleGoHome}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Accueil
            </Button>
          </div>
>>>>>>> Stashed changes
        </div>
      );
    }

    return this.props.children;
  }
}
<<<<<<< Updated upstream
=======

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
>>>>>>> Stashed changes
