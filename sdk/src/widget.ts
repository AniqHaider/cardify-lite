import "./card"; // registers <cardify-card>
import { Overlay, type OverlayConfig } from "./overlay";

export { CardifyCard } from "./card";
export type { OverlayConfig } from "./overlay";

const overlay = new Overlay();

/** Take over (or restyle) every Cardify-marked card on the page. */
export function applyConfig(cfg: OverlayConfig): void {
  overlay.apply(cfg);
}

/** Hand every card back to the host's native markup. */
export function stop(): void {
  overlay.stop();
}
