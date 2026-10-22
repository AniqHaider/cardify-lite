import type { CardifyPublicConfig, CardifySettings } from "@cardify/shared";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100";

async function call(path: string, key: string, init?: RequestInit): Promise<CardifyPublicConfig> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-admin-key": key },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as CardifyPublicConfig;
}

export const getSettings = (merchantId: string, key: string) =>
  call(`/cardify/admin/${encodeURIComponent(merchantId)}/settings`, key);

export const saveSettings = (merchantId: string, key: string, settings: CardifySettings) =>
  call(`/cardify/admin/${encodeURIComponent(merchantId)}/settings`, key, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
