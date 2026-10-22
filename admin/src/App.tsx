import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  DESIGNS,
  IMAGE_RATIOS,
  type CardifyOptions,
  type CardifySettings,
  type DesignId,
  type ImageRatio,
} from "@cardify/shared";
import { getSettings, saveSettings } from "./api";
import { CardPreview } from "./Preview";

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL ?? "http://localhost:4344";

function stored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode — the value just won't survive a reload */
  }
}

type Status = { kind: "loading" | "idle" | "saving" | "saved" | "error"; message?: string };

const TOGGLES: { key: keyof CardifyOptions & `show${string}`; label: string }[] = [
  { key: "showBadge", label: "Product badge (e.g. “New”)" },
  { key: "showQuickBuy", label: "Quick-buy button" },
  { key: "showRating", label: "Star rating" },
  { key: "showCompareAt", label: "Crossed-out compare price" },
];

export function App() {
  const [merchantId, setMerchantId] = useState(() => stored("cardify.mid", import.meta.env.VITE_DEFAULT_MERCHANT_ID ?? ""));
  const [adminKey, setAdminKey] = useState(() => stored("cardify.key", import.meta.env.VITE_ADMIN_KEY ?? ""));
  const [draftMid, setDraftMid] = useState(merchantId);
  const [draftKey, setDraftKey] = useState(adminKey);

  const [settings, setSettings] = useState<CardifySettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const dirty = useRef(false);

  // Load whenever the connection changes.
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setStatus({ kind: "loading" });
    getSettings(merchantId, adminKey).then(
      (cfg) => {
        if (!alive) return;
        dirty.current = false;
        setSettings({ enabled: cfg.enabled, design: cfg.design, options: cfg.options });
        setLoaded(true);
        setStatus({ kind: "idle" });
      },
      (err: Error) => alive && setStatus({ kind: "error", message: err.message }),
    );
    return () => {
      alive = false;
    };
  }, [merchantId, adminKey]);

  // Autosave (debounced) — only for edits made here, never for the initial load.
  useEffect(() => {
    if (!loaded || !dirty.current) return;
    const t = setTimeout(async () => {
      setStatus({ kind: "saving" });
      try {
        await saveSettings(merchantId, adminKey, settings);
        dirty.current = false;
        setStatus({ kind: "saved" });
      } catch (err) {
        setStatus({ kind: "error", message: (err as Error).message });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [settings, loaded, merchantId, adminKey]);

  const change = (next: CardifySettings) => {
    dirty.current = true;
    setSettings(next);
    // Say so immediately — otherwise the pill keeps showing the previous
    // "Saved ✓" for the length of the debounce, which is misleading.
    setStatus({ kind: "saving" });
  };
  const setOption = <K extends keyof CardifyOptions>(key: K, value: CardifyOptions[K]) =>
    change({ ...settings, options: { ...settings.options, [key]: value } });

  const connect = () => {
    persist("cardify.mid", draftMid.trim());
    persist("cardify.key", draftKey);
    setMerchantId(draftMid.trim());
    setAdminKey(draftKey);
  };

  const o = settings.options;

  return (
    <main className="app">
      <header className="top">
        <div>
          <h1>Cardify</h1>
          <p className="muted">Alternative product-card designs for your storefront.</p>
        </div>
        <StatusPill status={status} />
      </header>

      <section className="panel conn">
        <label>
          Merchant ID
          <input value={draftMid} onChange={(e) => setDraftMid(e.target.value)} spellCheck={false} />
        </label>
        <label>
          Admin key
          <input type="password" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
        </label>
        <button className="btn" onClick={connect}>
          Connect
        </button>
        <a className="btn ghost" href={STOREFRONT_URL} target="_blank" rel="noreferrer">
          Open storefront ↗
        </a>
      </section>

      <section className={`panel hero ${settings.enabled ? "on" : ""}`}>
        <div>
          <h2>Use Cardify cards on my storefront</h2>
          <p className="muted">
            On: your site’s product cards are replaced by the design chosen below, on the home, collection, product and
            search pages. Off: your original cards come back. Changes reach the live site within a few seconds.
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            aria-label="Use Cardify cards"
            checked={settings.enabled}
            disabled={!loaded}
            onChange={(e) => change({ ...settings, enabled: e.target.checked })}
          />
          <span />
        </label>
      </section>

      <div className="cols">
        <section className="panel">
          <h2>Style</h2>

          <div className="colors">
            {(
              [
                ["accentColor", "Accent"],
                ["textColor", "Text"],
                ["backgroundColor", "Card background"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input type="color" value={o[key]} disabled={!loaded} onChange={(e) => setOption(key, e.target.value)} />
              </label>
            ))}
          </div>

          <label className="field">
            Corner radius <b>{o.radius}px</b>
            <input
              type="range"
              min={0}
              max={24}
              value={o.radius}
              disabled={!loaded}
              onChange={(e) => setOption("radius", Number(e.target.value))}
            />
          </label>

          <label className="field">
            Image shape
            <select
              value={o.imageRatio}
              disabled={!loaded}
              onChange={(e) => setOption("imageRatio", e.target.value as ImageRatio)}
            >
              {IMAGE_RATIOS.map((r) => (
                <option key={r} value={r}>
                  {r === "1/1" ? "Square (1:1)" : r === "4/5" ? "Portrait (4:5)" : "Tall (3:4)"}
                </option>
              ))}
            </select>
          </label>

          <div className="checks">
            {TOGGLES.map(({ key, label }) => (
              <label key={key}>
                <input type="checkbox" checked={o[key]} disabled={!loaded} onChange={(e) => setOption(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Design</h2>
          <div className="gallery">
            {DESIGNS.map((d) => (
              <div key={d.id} className={`tile ${settings.design === d.id ? "selected" : ""}`}>
                <div className="tile-head">
                  <b>{d.name}</b>
                  <span className="muted">{d.description}</span>
                </div>
                <div className="tile-preview">
                  <CardPreview design={d.id as DesignId} options={o} />
                </div>
                <button
                  className={`btn ${settings.design === d.id ? "" : "ghost"}`}
                  disabled={!loaded}
                  onClick={() => change({ ...settings, design: d.id })}
                >
                  {settings.design === d.id ? "Selected ✓" : "Use this design"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: Status }) {
  const text = {
    loading: "Connecting…",
    idle: "Connected",
    saving: "Saving…",
    saved: "Saved ✓",
    error: status.message ?? "Error",
  }[status.kind];
  return (
    <span className={`pill ${status.kind}`} role="status">
      {text}
    </span>
  );
}
