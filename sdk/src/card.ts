import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { DEFAULT_OPTIONS } from "@cardify/shared";
import type { CardProduct, CardifyOptions, DesignId } from "@cardify/shared";

/** Black or white, whichever reads better on `hex`. */
function onColor(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#111111" : "#ffffff";
}

/**
 * <cardify-card> — one product card, five looks. The look is picked by the
 * reflected `design` attribute and driven entirely by CSS, so switching design
 * never changes the DOM structure (and the host's click/quick-buy bridging keeps
 * working identically for every design).
 *
 * Structure:  .card > .frame( a.media[img, img.hover, .badge], button.qb ) + .body
 * `.frame` is `display: contents` for the stacked designs (so .qb can sit AFTER
 * .body via `order`) and a positioned box for the designs that overlay the image.
 */
export class CardifyCard extends LitElement {
  static properties = {
    product: { attribute: false },
    design: { type: String, reflect: true },
    options: { attribute: false },
  };

  declare product?: CardProduct;
  declare design: DesignId;
  declare options?: CardifyOptions;

  constructor() {
    super();
    this.design = "classic";
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
      color: var(--cdf-text);
      font-family: inherit;
      -webkit-font-smoothing: antialiased;
    }
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    a:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--cdf-accent);
      outline-offset: 2px;
    }

    /* ---------- shared structure ---------- */
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--cdf-bg);
      border-radius: var(--cdf-radius);
      overflow: hidden;
    }
    .frame {
      display: contents;
    }
    .media {
      order: 0;
      position: relative;
      display: block;
      aspect-ratio: var(--cdf-ratio);
      overflow: hidden;
      background: #f2f2f2;
    }
    .img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.35s ease, transform 0.5s ease;
    }
    .hover {
      opacity: 0;
    }
    .media:hover .hover {
      opacity: 1;
    }
    .badge {
      position: absolute;
      left: 10px;
      bottom: 10px;
      z-index: 2;
      padding: 3px 9px;
      border-radius: 999px;
      background: var(--cdf-accent);
      color: var(--cdf-on-accent);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    .body {
      order: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 10px 14px;
      text-align: center;
    }
    .vendor {
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.6;
    }
    .title {
      margin: 0;
      font-size: 13px;
      line-height: 1.35;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .rating {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
    }
    .stars {
      color: #f5a623;
      letter-spacing: 1px;
    }
    .count {
      opacity: 0.6;
    }
    .price {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: center;
      gap: 4px 8px;
      font-size: 15px;
    }
    .compare {
      font-size: 13px;
      opacity: 0.55;
    }
    .off {
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--cdf-accent);
      color: var(--cdf-on-accent);
      font-size: 11px;
      font-weight: 600;
    }
    .qb {
      order: 2;
      width: 100%;
      height: 40px;
      border: 0;
      background: var(--cdf-accent);
      color: var(--cdf-on-accent);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      transition: filter 0.2s ease, background 0.2s ease, color 0.2s ease, opacity 0.25s ease,
        transform 0.25s ease;
    }
    .qb:hover {
      filter: brightness(1.12);
    }

    /* ---------- 1. classic: bordered card, always-visible quick-buy bar ---------- */
    :host([design="classic"]) .card {
      border: 1px solid color-mix(in srgb, var(--cdf-text) 12%, transparent);
    }

    /* ---------- 2. minimal: borderless, left aligned, text-link quick add ---------- */
    :host([design="minimal"]) .card {
      background: transparent;
      border-radius: 0;
      overflow: visible;
    }
    :host([design="minimal"]) .media {
      border-radius: var(--cdf-radius);
    }
    :host([design="minimal"]) .body {
      align-items: flex-start;
      padding: 12px 0 0;
      text-align: left;
    }
    :host([design="minimal"]) .title {
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0;
    }
    :host([design="minimal"]) .price {
      justify-content: flex-start;
    }
    :host([design="minimal"]) .badge {
      top: 10px;
      bottom: auto;
      background: #fff;
      color: #111;
    }
    :host([design="minimal"]) .off {
      padding: 0;
      background: none;
      color: var(--cdf-accent);
    }
    :host([design="minimal"]) .qb {
      width: auto;
      height: auto;
      padding: 8px 0 0;
      background: none;
      color: var(--cdf-text);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.02em;
      text-align: left;
      text-transform: none;
      text-decoration: underline;
      text-underline-offset: 3px;
      align-self: flex-start;
    }
    :host([design="minimal"]) .qb::before {
      content: "+ ";
    }

    /* ---------- 3. overlay: copy sits on a gradient over the photo ---------- */
    :host([design="overlay"]) .card {
      color: #fff;
    }
    :host([design="overlay"]) .frame {
      display: block;
      position: relative;
    }
    :host([design="overlay"]) .body {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      align-items: flex-start;
      padding: 56px 14px 14px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0));
      text-align: left;
      pointer-events: none;
    }
    :host([design="overlay"]) .body a {
      pointer-events: auto;
    }
    :host([design="overlay"]) .title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    :host([design="overlay"]) .price {
      justify-content: flex-start;
    }
    :host([design="overlay"]) .compare {
      color: rgba(255, 255, 255, 0.7);
    }
    :host([design="overlay"]) .badge {
      top: 10px;
      bottom: auto;
    }
    :host([design="overlay"]) .qb {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 3;
      width: auto;
      height: 34px;
      padding: 0 14px;
      border-radius: 999px;
      font-size: 12px;
    }

    /* ---------- 4. hover reveal: lift, second image, slide-in quick buy ---------- */
    :host([design="hover-reveal"]) .card {
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    :host([design="hover-reveal"]) .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.16);
    }
    :host([design="hover-reveal"]) .frame {
      display: block;
      position: relative;
    }
    :host([design="hover-reveal"]) .body {
      align-items: flex-start;
      padding: 12px 14px 16px;
      text-align: left;
    }
    :host([design="hover-reveal"]) .price {
      justify-content: flex-start;
    }
    :host([design="hover-reveal"]) .badge {
      top: 10px;
      bottom: auto;
    }
    :host([design="hover-reveal"]) .qb {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 3;
      width: auto;
      border-radius: calc(var(--cdf-radius) * 0.75);
      opacity: 0;
      transform: translateY(10px);
    }
    :host([design="hover-reveal"]) .card:hover .qb,
    :host([design="hover-reveal"]) .qb:focus-visible {
      opacity: 1;
      transform: none;
    }
    /* Touch has no hover, and A typical store's own cards keep quick buy permanently
       visible below 750px — match both so it is never unreachable. */
    @media (hover: none), (max-width: 749px) {
      :host([design="hover-reveal"]) .qb {
        opacity: 1;
        transform: none;
      }
    }

    /* ---------- 5. editorial: serif caps, hairlines, outlined button ---------- */
    :host([design="editorial"]) .card {
      background: transparent;
      border-radius: 0;
      overflow: visible;
    }
    :host([design="editorial"]) .media {
      border-radius: var(--cdf-radius);
    }
    :host([design="editorial"]) .body {
      padding: 14px 0 6px;
    }
    :host([design="editorial"]) .title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    :host([design="editorial"]) .price {
      width: 100%;
      margin-top: 4px;
      padding-top: 9px;
      border-top: 1px solid color-mix(in srgb, var(--cdf-text) 18%, transparent);
      font-size: 13px;
      letter-spacing: 0.08em;
    }
    :host([design="editorial"]) .badge {
      top: 0;
      left: 0;
      bottom: auto;
      border-radius: 0;
    }
    :host([design="editorial"]) .off {
      border-radius: 0;
    }
    :host([design="editorial"]) .qb {
      height: 38px;
      margin-top: 8px;
      border: 1px solid var(--cdf-accent);
      border-radius: calc(var(--cdf-radius) * 0.5);
      background: transparent;
      color: var(--cdf-accent);
      filter: none;
    }
    :host([design="editorial"]) .qb:hover {
      background: var(--cdf-accent);
      color: var(--cdf-on-accent);
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
      }
    }
  `;

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has("options")) return;
    const o = this.options ?? DEFAULT_OPTIONS;
    const s = this.style;
    s.setProperty("--cdf-accent", o.accentColor);
    s.setProperty("--cdf-on-accent", onColor(o.accentColor));
    s.setProperty("--cdf-text", o.textColor);
    s.setProperty("--cdf-bg", o.backgroundColor);
    s.setProperty("--cdf-radius", `${o.radius}px`);
    s.setProperty("--cdf-ratio", o.imageRatio);
  }

  private onLink(e: MouseEvent) {
    const ev = new CustomEvent("cardify:card:click", {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: {
        product: this.product,
        modified: e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0,
      },
    });
    this.dispatchEvent(ev);
    // The host may take over navigation (e.g. client-side routing).
    if (ev.defaultPrevented) e.preventDefault();
  }

  private onQuickBuy() {
    this.dispatchEvent(
      new CustomEvent("cardify:quickbuy:request", {
        bubbles: true,
        composed: true,
        detail: { product: this.product },
      }),
    );
  }

  protected render() {
    const p = this.product;
    if (!p) return nothing;
    const o = this.options ?? DEFAULT_OPTIONS;

    const showCompare = o.showCompareAt && !!p.compareAtPrice;
    const rating = p.rating ?? 0;
    const max = p.ratingMax ?? 5;
    const filled = Math.max(0, Math.min(max, Math.round(rating)));
    const showQuick = o.showQuickBuy && p.quickBuy === true;
    const label = p.quickBuyLabel || "Quick buy";

    return html`
      <article class="card">
        <div class="frame">
          <a class="media" href=${p.href} tabindex="-1" aria-hidden="true" @click=${this.onLink}>
            <img class="img" src=${p.image} alt=${p.alt ?? p.title} loading="lazy" decoding="async" />
            ${p.imageHover
              ? html`<img class="img hover" src=${p.imageHover} alt="" loading="lazy" decoding="async" />`
              : nothing}
            ${o.showBadge && p.badge ? html`<span class="badge">${p.badge}</span>` : nothing}
          </a>
          ${showQuick
            ? html`<button
                class="qb"
                type="button"
                aria-label=${`${label}: ${p.title}`}
                @click=${this.onQuickBuy}
              >
                ${label}
              </button>`
            : nothing}
        </div>
        <div class="body">
          ${p.vendor ? html`<span class="vendor">${p.vendor}</span>` : nothing}
          <h3 class="title"><a href=${p.href} @click=${this.onLink}>${p.title}</a></h3>
          ${o.showRating && rating > 0
            ? html`<div class="rating" role="img" aria-label=${`${rating.toFixed(1)} out of ${max}`}>
                <span class="stars" aria-hidden="true">${"★".repeat(filled)}${"☆".repeat(max - filled)}</span>
                ${p.ratingCount ? html`<span class="count" aria-hidden="true">(${p.ratingCount})</span>` : nothing}
              </div>`
            : nothing}
          <div class="price">
            ${showCompare ? html`<s class="compare">${p.compareAtPrice}</s>` : nothing}
            <span class="now">${p.price}</span>
            ${p.discountLabel ? html`<span class="off">${p.discountLabel}</span>` : nothing}
          </div>
        </div>
      </article>
    `;
  }
}

if (!customElements.get("cardify-card")) {
  customElements.define("cardify-card", CardifyCard);
}
