/**
 * PWA service worker registration with iframe/preview safety.
 * Only registers on production deployments outside the Lovable preview iframe.
 */
export function registerPWA() {
  if (typeof window === "undefined") return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") === false && host.includes("localhost");

  if (isInIframe || isPreviewHost) {
    // Aggressively unregister any stale service workers in preview/iframe
    navigator.serviceWorker?.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  // Dynamically register the auto-generated SW from vite-plugin-pwa
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* plugin not active in dev */
    });
}
