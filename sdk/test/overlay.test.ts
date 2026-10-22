import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_OPTIONS } from "@cardify/shared";
import type { CardProduct } from "@cardify/shared";
import type { CardifyCard } from "../src/card";
import "../src/card";
import { Overlay } from "../src/overlay";

const product: CardProduct = {
  title: "Sunny Dress",
  href: "/products/sunny-dress",
  image: "https://example.com/a.jpg",
  imageHover: "https://example.com/b.jpg",
  price: "₹1,299",
  compareAtPrice: "₹1,999",
  discountLabel: "35% off",
  badge: "New",
  rating: 4.4,
  ratingCount: 18,
  quickBuy: true,
  quickBuyLabel: "Quick buy",
};
const cfg = { design: "classic", options: DEFAULT_OPTIONS } as const;

let list: HTMLUListElement;
let overlay: Overlay;

function addCard(p: CardProduct | string = product): HTMLLIElement {
  const li = document.createElement("li");
  li.setAttribute("data-cardify-card", "");
  li.setAttribute("data-cardify-product", typeof p === "string" ? p : JSON.stringify(p));
  li.innerHTML = `<div class="native"><a data-cardify-link href="${product.href}">Native</a><button data-cardify-quickbuy>QB</button></div>`;
  list.appendChild(li);
  return li;
}
const cardOf = (li: Element) => li.querySelector("cardify-card") as CardifyCard;
const settle = () => new Promise((r) => setTimeout(r, 40));

beforeEach(() => {
  document.body.innerHTML = '<ul id="list"></ul>';
  list = document.getElementById("list") as HTMLUListElement;
  overlay = new Overlay(document);
});
afterEach(() => overlay.stop());

describe("Overlay", () => {
  it("mounts a card in every marked cell, hides the native one, and renders the product", async () => {
    const li = addCard();
    overlay.apply(cfg);
    const el = cardOf(li);
    await el.updateComplete;

    expect(li.hasAttribute("data-cardify-active")).toBe(true);
    expect(document.head.querySelector("style[data-cardify]")).not.toBeNull();
    expect(el.shadowRoot?.querySelector(".title")?.textContent).toContain("Sunny Dress");
    expect(el.shadowRoot?.querySelector(".now")?.textContent).toBe("₹1,299");
    expect(el.shadowRoot?.querySelector(".qb")?.textContent?.trim()).toBe("Quick buy");
  });

  it("leaves a cell with unparseable data on its native card", () => {
    const li = addCard("{not json");
    overlay.apply(cfg);
    expect(cardOf(li)).toBeNull();
    expect(li.hasAttribute("data-cardify-active")).toBe(false);
  });

  it("restyles live when the design changes", async () => {
    const li = addCard();
    overlay.apply(cfg);
    overlay.apply({ design: "editorial", options: { ...DEFAULT_OPTIONS, accentColor: "#ed186f" } });
    const el = cardOf(li);
    await el.updateComplete;
    expect(el.getAttribute("design")).toBe("editorial");
    expect(el.style.getPropertyValue("--cdf-accent")).toBe("#ed186f");
    expect(list.querySelectorAll("cardify-card")).toHaveLength(1); // restyled, not duplicated
  });

  it("hides the quick-buy button when the host card has none", async () => {
    const li = addCard({ ...product, quickBuy: false });
    overlay.apply(cfg);
    await cardOf(li).updateComplete;
    expect(cardOf(li).shadowRoot?.querySelector(".qb")).toBeNull();
  });

  it("picks up cards that render later and ones whose data changes", async () => {
    const first = addCard();
    overlay.apply(cfg);
    const late = addCard({ ...product, title: "Late Arrival" });
    await settle();
    expect(cardOf(late)).not.toBeNull();

    first.setAttribute("data-cardify-product", JSON.stringify({ ...product, title: "Renamed" }));
    await settle();
    await cardOf(first).updateComplete;
    expect(cardOf(first).shadowRoot?.querySelector(".title")?.textContent).toContain("Renamed");
  });

  it("proxies a plain title click to the hidden native link and cancels the card's own navigation", async () => {
    const li = addCard();
    overlay.apply(cfg);
    const el = cardOf(li);
    await el.updateComplete;
    const nativeClick = vi.spyOn(li.querySelector<HTMLElement>("[data-cardify-link]")!, "click");

    const event = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true });
    el.shadowRoot!.querySelector(".title a")!.dispatchEvent(event);

    expect(nativeClick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets ctrl/cmd-clicks open in a new tab natively", async () => {
    const li = addCard();
    overlay.apply(cfg);
    const el = cardOf(li);
    await el.updateComplete;
    const nativeClick = vi.spyOn(li.querySelector<HTMLElement>("[data-cardify-link]")!, "click");

    const event = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, ctrlKey: true });
    el.shadowRoot!.querySelector(".title a")!.dispatchEvent(event);

    expect(nativeClick).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("proxies quick buy to the host's own quick-buy button", async () => {
    const li = addCard();
    overlay.apply(cfg);
    const el = cardOf(li);
    await el.updateComplete;
    const nativeClick = vi.spyOn(li.querySelector<HTMLElement>("[data-cardify-quickbuy]")!, "click");

    el.shadowRoot!.querySelector<HTMLButtonElement>(".qb")!.click();
    expect(nativeClick).toHaveBeenCalledTimes(1);
  });

  it("stop() puts every native card back and removes all traces", async () => {
    const li = addCard();
    overlay.apply(cfg);
    await cardOf(li).updateComplete;
    overlay.stop();

    expect(cardOf(li)).toBeNull();
    expect(li.hasAttribute("data-cardify-active")).toBe(false);
    expect(document.head.querySelector("style[data-cardify]")).toBeNull();
    expect(li.querySelector(".native")).not.toBeNull();

    addCard();
    await settle();
    expect(list.querySelectorAll("cardify-card")).toHaveLength(0); // observer is gone too
  });
});
