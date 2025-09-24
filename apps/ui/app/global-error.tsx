'use client';

import { useEffect } from 'react';
import { toUIError, formatErrorForLogging } from '@/lib/ui/errorUtils';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global Error Boundary for Next.js App Router
 *
 * This catches unhandled errors at the root level and provides
 * a fallback UI with Islamic spiritual context.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error for debugging
    const errorInfo = formatErrorForLogging(error);
    console.error('Global error caught:', errorInfo);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorReporting(errorInfo);
    }
  }, [error]);

  const uiError = toUIError(error);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-gold-50/30 flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            {/* Islamic Header */}
            <div className="text-center mb-8">
              <div className="text-2xl text-emerald-700 font-arabic mb-2">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
              <p className="text-sm text-sage-600">In the name of Allah, the Most Gracious, the Most Merciful</p>
            </div>

            {/* Error Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🤲</div>
                  <div>
                    <h1 className="text-xl font-bold">Something Went Wrong</h1>
                    <p className="text-red-100">We encountered an unexpected issue</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-sage-900 mb-2">What happened?</h2>
                  <p className="text-sage-700 leading-relaxed">
                    {uiError.userMessage}
                  </p>
                </div>

                {/* Islamic Encouragement */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-emerald-600 text-lg">🌿</div>
                    <div>
                      <h3 className="font-medium text-emerald-800 mb-1">Remember</h3>
                      <p className="text-sm text-emerald-700 leading-relaxed">
                        \"And whoever relies upon Allah - then He is sufficient for him.
                        Indeed, Allah will accomplish His purpose.\"
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">— Quran 65:3</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    Try Again
                  </button>
                  <a
                    href="/"
                    className="flex-1 px-4 py-3 border border-sage-300 text-sage-700 rounded-lg font-medium text-center hover:bg-sage-50 transition-colors focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2"
                  >
                    Return Home
                  </a>
                </div>

                {/* Debug Info (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-6 text-xs">
                    <summary className="cursor-pointer text-sage-600 hover:text-sage-800">
                      Technical Details
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded border font-mono text-gray-700">
                      <p><strong>Error Code:</strong> {uiError.code}</p>
                      <p><strong>Message:</strong> {error.message}</p>
                      {uiError.traceId && <p><strong>Trace ID:</strong> {uiError.traceId}</p>}
                      {error.digest && <p><strong>Digest:</strong> {error.digest}</p>}
                      {error.stack && (
                        <details className="mt-2">
                          <summary>Stack Trace</summary>
                          <pre className="mt-1 text-xs whitespace-pre-wrap">{error.stack}</pre>
                        </details>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 text-sm text-sage-600">
              <p>May Allah make this easy for you. Ameen.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}