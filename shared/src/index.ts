/**
 * The Cardify contract shared by the backend, the admin and the SDK.
 * Pure types + constants only — NO runtime dependencies, so the browser SDK can
 * import it without pulling zod in. Validation lives in `./schema`.
 */

export const DESIGNS = [
  {
    id: "classic",
    name: "Classic",
    description: "Bordered card, centred text, full-width quick-buy bar.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Borderless and airy, left-aligned, text-link quick add.",
  },
  {
    id: "overlay",
    name: "Overlay",
    description: "Image-first, title and price sit on a gradient over the photo.",
  },
  {
    id: "hover-reveal",
    name: "Hover reveal",
    description: "Lifts on hover, swaps to the second image, slides in quick buy.",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Tall image, serif uppercase title, outlined quick-buy button.",
  },
] as const;

export type DesignId = (typeof DESIGNS)[number]["id"];

export const IMAGE_RATIOS = ["1/1", "4/5", "3/4"] as const;
export type ImageRatio = (typeof IMAGE_RATIOS)[number];

export interface CardifyOptions {
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  /** Corner radius in px, 0–24. */
  radius: number;
  imageRatio: ImageRatio;
  showBadge: boolean;
  showQuickBuy: boolean;
  showRating: boolean;
  showCompareAt: boolean;
}

export interface CardifySettings {
  enabled: boolean;
  design: DesignId;
  options: CardifyOptions;
}

/** What `GET /cardify/sdk/config/:merchantId` returns. */
export interface CardifyPublicConfig extends CardifySettings {
  /** Epoch ms of the last save (0 = never saved). Lets the SDK skip no-op updates. */
  version: number;
}

/**
 * The card data a storefront hands the SDK — deliberately the same fields the
 * storefront's own product cards already render, so Cardify is cosmetic only.
 */
export interface CardProduct {
  title: string;
  href: string;
  image: string;
  imageHover?: string;
  alt?: string;
  price: string;
  compareAtPrice?: string;
  discountLabel?: string;
  badge?: string;
  vendor?: string;
  rating?: number;
  ratingMax?: number;
  ratingCount?: number;
  /** Whether the host card offers a quick-buy button at all. */
  quickBuy?: boolean;
  /** The host card's own (already translated) quick-buy label. */
  quickBuyLabel?: string;
}

export const DEFAULT_OPTIONS: CardifyOptions = {
  accentColor: "#111111",
  textColor: "#111111",
  backgroundColor: "#ffffff",
  radius: 8,
  imageRatio: "4/5",
  showBadge: true,
  showQuickBuy: true,
  showRating: true,
  showCompareAt: true,
};

export const DEFAULT_SETTINGS: CardifySettings = {
  enabled: false,
  design: "classic",
  options: DEFAULT_OPTIONS,
};

/** Merchant ids are short lowercase alphanumerics (e.g. `demostore`). */
export const MERCHANT_ID_PATTERN = /^[a-z0-9]{6,32}$/;
