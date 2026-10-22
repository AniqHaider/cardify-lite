import { createElement, useEffect, useRef, useState } from "react";
import type { CardProduct, CardifyOptions, DesignId } from "@cardify/shared";
import { API_BASE } from "./api";

// The admin previews with the REAL <cardify-card> from the SDK bundle the
// storefront loads, so what the merchant picks here is exactly what shoppers see.
let widgetReady: Promise<unknown> | null = null;
const loadWidget = () =>
  (widgetReady ??= import(/* @vite-ignore */ `${API_BASE}/cardify/sdk/cardify-widget.js`).catch((err) => {
    widgetReady = null;
    throw err;
  }));

function placeholder(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,78%)"/><stop offset="1" stop-color="hsl(${hue + 40},65%,62%)"/></linearGradient></defs><rect width="480" height="600" fill="url(#g)"/><text x="240" y="310" font-family="sans-serif" font-size="30" fill="rgba(255,255,255,.85)" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PRODUCT: CardProduct = {
  title: "Sunny Day Frock",
  href: "#",
  image: placeholder(330, "Front"),
  imageHover: placeholder(20, "Back"),
  price: "₹1,299",
  compareAtPrice: "₹1,999",
  discountLabel: "35% off",
  badge: "New",
  vendor: "Acme Kids",
  rating: 4.5,
  ratingMax: 5,
  ratingCount: 128,
  quickBuy: true,
  quickBuyLabel: "Quick buy",
};

export function CardPreview({ design, options }: { design: DesignId; options: CardifyOptions }) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    loadWidget().then(
      () => alive && setState("ready"),
      () => alive && setState("error"),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current as (HTMLElement & Record<string, unknown>) | null;
    if (!el || state !== "ready") return;
    el.product = SAMPLE_PRODUCT;
    el.design = design;
    el.options = options;
  });

  if (state === "error") return <p className="muted">Can’t load the SDK — is the backend running and the SDK built?</p>;
  if (state === "loading") return <p className="muted">Loading preview…</p>;
  return createElement("cardify-card", { ref });
}
