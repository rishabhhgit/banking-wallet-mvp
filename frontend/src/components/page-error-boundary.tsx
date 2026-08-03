"use client";

import { ErrorBoundary } from "@/components/error-boundary";

export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[600px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h2 className="text-base font-semibold text-obsidian mb-2">
              Page Error
            </h2>
            <p className="text-sm text-stone mb-4">
              This page encountered an error. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gold-500 text-white text-sm font-medium rounded-lg hover:bg-gold-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
