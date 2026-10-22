import type { CardifyPublicConfig } from "@cardify/shared";

/**
 * cardify-loader.js — the only file a storefront includes:
 *
 *   <script src="https://<backend>/cardify/sdk/cardify-loader.js?store=<merchantId>">
 *
 * It reads the merchant's setting and, ONLY when cards are switched on, pulls in
 * the widget bundle. Switched off (or backend unreachable / bundle fails) means
 * the host's native cards are never touched. It re-checks whenever the tab
 * regains focus, so flipping the setting in the admin shows up on the site the
 * moment you switch back to it — no reload.
 */
interface WidgetModule {
  applyConfig(cfg: Pick<CardifyPublicConfig, "design" | "options">): void;
  stop(): void;
}

declare global {
  interface Window {
    Cardify?: { refresh(): Promise<void> };
  }
}

(function boot() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script || window.Cardify) return;

  const url = new URL(script.src);
  const store = url.searchParams.get("store");
  if (!store) {
    console.warn("[cardify] loader needs ?store=<merchantId>");
    return;
  }
  // …/cardify/sdk/cardify-loader.js → …/cardify/sdk/
  const base = url.origin + url.pathname.replace(/[^/]+$/, "");
  const configUrl = `${base}config/${encodeURIComponent(store)}`;

  let widget: Promise<WidgetModule> | null = null;
  const loadWidget = (): Promise<WidgetModule> => {
    widget ??= import(/* @vite-ignore */ `${base}cardify-widget.js`).catch((err) => {
      widget = null; // allow a retry on the next poll
      throw err;
    });
    return widget;
  };

  let seen = "";

  async function refresh(): Promise<void> {
    try {
      const res = await fetch(configUrl, { cache: "no-store" });
      if (!res.ok) return;
      const cfg = (await res.json()) as CardifyPublicConfig;

      const fingerprint = `${cfg.version}:${cfg.enabled}`;
      if (fingerprint === seen) return;

      if (cfg.enabled) {
        (await loadWidget()).applyConfig({ design: cfg.design, options: cfg.options });
      } else if (widget) {
        (await widget).stop();
      }
      seen = fingerprint; // only after success, so a failed load retries
    } catch (err) {
      console.warn("[cardify]", err);
    }
  }

  window.Cardify = { refresh };

  // On load, and whenever the shopper (or the merchant, coming back from the
  // admin) returns to the tab. No timer: polling would make every visitor's tab
  // hit the backend for as long as it is open.
  void refresh();
  window.addEventListener("focus", () => void refresh());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh();
  });
})();
