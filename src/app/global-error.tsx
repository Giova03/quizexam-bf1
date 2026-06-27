"use client";

/**
 * global-error.tsx — Next.js App Router global error boundary.
 *
 * This component replaces the entire layout when an error propagates to the
 * root. It MUST include its own <html> and <body> tags because Next.js
 * discards the root layout when this component is rendered.
 *
 * Reference: https://nextjs.org/docs/app/api-reference/file-conventions/error-handling
 */

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error for development / future Sentry integration.
  useEffect(() => {
    console.error("[GlobalError] Uncaught error:", error);
  }, [error]);

  const message = error?.message || "Une erreur inattendue s'est produite.";

  return (
    <html lang="fr">
      <body className="min-h-screen bg-muted/30 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div
            role="alert"
            className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl dark:border-rose-900/50 dark:bg-card"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50">
              <AlertTriangle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-foreground">
                Erreur de l&apos;application
              </h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              {error?.digest && (
                <p className="text-xs text-muted-foreground">
                  Code: {error.digest}
                </p>
              )}
            </div>
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              <RotateCcw className="h-4 w-4" />
              Réessayer
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              ou recharger la page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
