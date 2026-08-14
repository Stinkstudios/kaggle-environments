// Mirrors @kaggle-environments/core's postAnalyticsEvent (postMessage to the
// parent frame) rather than depending on core, which pulls in MUI/emotion for
// one 3-line function.
function postAnalyticsEvent(event: string | Record<string, unknown>): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ analyticsEvent: event }, '*');
}

export interface Analytics {
  trackEvent: (event: string) => void;
}

/** Creates a per-game `trackEvent`, tagging every event with `gameName`. */
export function createAnalytics(gameName: string): Analytics {
  return {
    trackEvent(event: string) {
      if (import.meta.env.DEV && import.meta.env.VITE_LOG_ANALYTICS) {
        console.log(`Track Event: ${event}`);
      }
      postAnalyticsEvent({ game: gameName, action: event });
    },
  };
}
