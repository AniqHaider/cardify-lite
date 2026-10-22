import type { CardProduct, CardifyOptions, DesignId } from "@cardify/shared";
import type { CardifyCard } from "./card";

/**
 * The host contract — what a storefront has to render for Cardify to take over:
 *
 *   <li data-cardify-card data-cardify-product='{"title":…}'>        card cell (any element)
 *     …native card markup…
 *       <a data-cardify-link href=…>                                 native product link   (optional)
 *       <button data-cardify-quickbuy>                               native quick-buy      (optional)
 *   </li>
 *
 * When switched on, each native card is HIDDEN (not removed) and a <cardify-card>
 * is mounted in the same cell, so the host's grid/carousel layout is untouched and
 * its own behaviour (client-side routing, quick-buy popup, analytics) still runs —
 * Cardify just clicks the hidden native link/button on the shopper's behalf.
 */
const CARD = "data-cardify-card";
const PRODUCT = "data-cardify-product";
const ACTIVE = "data-cardify-active";
const LINK = "[data-cardify-link]";
const QUICK_BUY = "[data-cardify-quickbuy]";

export interface OverlayConfig {
  design: DesignId;
  options: CardifyOptions;
}

export class Overlay {
  private cfg: OverlayConfig | null = null;
  private observer: MutationObserver | null = null;
  private styleEl: HTMLStyleElement | null = null;
  private raf = 0;

  constructor(private readonly doc: Document = document) {}

  get running(): boolean {
    return this.cfg !== null;
  }

  /** Start overlaying, or restyle if already running. */
  apply(cfg: OverlayConfig): void {
    const wasRunning = this.running;
    this.cfg = cfg;
    if (!wasRunning) this.attach();
    this.scan();
  }

  /** Put every native card back exactly as it was. */
  stop(): void {
    if (!this.running) return;
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    this.observer = null;
    this.doc.removeEventListener("cardify:card:click", this.onCardClick as EventListener);
    this.doc.removeEventListener("cardify:quickbuy:request", this.onQuickBuy as EventListener);
    this.doc.querySelectorAll("cardify-card").forEach((el) => el.remove());
    this.doc.querySelectorAll(`[${ACTIVE}]`).forEach((el) => el.removeAttribute(ACTIVE));
    this.styleEl?.remove();
    this.styleEl = null;
    this.cfg = null;
  }

  private attach(): void {
    this.styleEl = this.doc.createElement("style");
    this.styleEl.dataset.cardify = "";
    this.styleEl.textContent =
      `[${ACTIVE}] > :not(cardify-card){display:none!important}` +
      `[${ACTIVE}] > cardify-card{display:block;height:100%}`;
    this.doc.head.appendChild(this.styleEl);

    this.doc.addEventListener("cardify:card:click", this.onCardClick as EventListener);
    this.doc.addEventListener("cardify:quickbuy:request", this.onQuickBuy as EventListener);

    // Cards appear later (load-more, filters, search, client-side navigation) and
    // the host re-renders `data-cardify-product` when its data changes.
    this.observer = new MutationObserver(() => {
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => this.scan());
    });
    this.observer.observe(this.doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [PRODUCT],
    });
  }

  private scan(): void {
    if (!this.cfg) return;
    this.doc.querySelectorAll<HTMLElement>(`[${CARD}]`).forEach((host) => this.mount(host, this.cfg as OverlayConfig));
  }

  private mount(host: HTMLElement, cfg: OverlayConfig): void {
    const raw = host.getAttribute(PRODUCT);
    if (!raw) return;

    let product: CardProduct;
    try {
      product = JSON.parse(raw) as CardProduct;
    } catch {
      return; // malformed host data → leave the native card alone
    }

    let el = Array.from(host.children).find((c) => c.localName === "cardify-card") as CardifyCard | undefined;
    if (!el) {
      el = this.doc.createElement("cardify-card") as CardifyCard;
      host.appendChild(el);
    }
    if (el.dataset.src !== raw) {
      el.dataset.src = raw;
      el.product = product;
    }
    if (el.design !== cfg.design) el.design = cfg.design;
    if (el.options !== cfg.options) el.options = cfg.options;
    if (!host.hasAttribute(ACTIVE)) host.setAttribute(ACTIVE, "");
  }

  private onCardClick = (ev: CustomEvent<{ modified: boolean }>): void => {
    // New-tab / modified clicks keep the browser's default behaviour.
    if (ev.detail?.modified) return;
    const native = this.nativeIn(ev, LINK);
    if (!native) return;
    ev.preventDefault(); // stops the card's own <a> navigating; native link handles it
    native.click();
  };

  private onQuickBuy = (ev: Event): void => {
    this.nativeIn(ev, QUICK_BUY)?.click();
  };

  private nativeIn(ev: Event, selector: string): HTMLElement | null {
    const host = (ev.target as Element | null)?.closest?.(`[${CARD}]`);
    return host?.querySelector<HTMLElement>(selector) ?? null;
  }
}
