import { describe, expect, it, beforeEach } from "vitest";
import { DEFAULT_OPTIONS, DEFAULT_SETTINGS } from "@cardify/shared";
import { buildApp } from "../src/app";
import { MemorySettingsRepo } from "../src/repo";

const KEY = "test-admin-key";
const MID = "demostore";
const config = { adminApiKey: KEY, adminOrigins: ["http://localhost:5173"], sdkDir: "/nonexistent" };

const validSettings = {
  enabled: true,
  design: "overlay",
  options: { ...DEFAULT_OPTIONS, accentColor: "#ed186f", radius: 12 },
};

async function make() {
  return buildApp({ repo: new MemorySettingsRepo(), config });
}

describe("public config", () => {
  it("returns disabled defaults for a merchant that never saved", async () => {
    const app = await make();
    const res = await app.inject({ method: "GET", url: `/cardify/sdk/config/${MID}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ...DEFAULT_SETTINGS, version: 0 });
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("rejects a malformed merchant id", async () => {
    const app = await make();
    const res = await app.inject({ method: "GET", url: "/cardify/sdk/config/NOT_VALID!" });
    expect(res.statusCode).toBe(400);
  });
});

describe("admin settings", () => {
  let app: Awaited<ReturnType<typeof make>>;
  beforeEach(async () => {
    app = await make();
  });

  const put = (headers: Record<string, string>, payload: unknown) =>
    app.inject({ method: "PUT", url: `/cardify/admin/${MID}/settings`, headers, payload: payload as object });

  it("401s without the key, with a wrong key, and with a wrong-length key", async () => {
    expect((await put({}, validSettings)).statusCode).toBe(401);
    expect((await put({ "x-admin-key": "nope-nope" }, validSettings)).statusCode).toBe(401);
    expect((await put({ "x-admin-key": "x" }, validSettings)).statusCode).toBe(401);
  });

  it("saves valid settings and the public config reflects them", async () => {
    const saved = await put({ "x-admin-key": KEY }, validSettings);
    expect(saved.statusCode).toBe(200);
    expect(saved.json().version).toBeGreaterThan(0);

    const pub = await app.inject({ method: "GET", url: `/cardify/sdk/config/${MID}` });
    expect(pub.json()).toMatchObject({ enabled: true, design: "overlay" });
    expect(pub.json().options.accentColor).toBe("#ed186f");
  });

  it("400s on an unknown design and on out-of-range options", async () => {
    const badDesign = await put({ "x-admin-key": KEY }, { ...validSettings, design: "neon" });
    expect(badDesign.statusCode).toBe(400);
    const badRadius = await put(
      { "x-admin-key": KEY },
      { ...validSettings, options: { ...DEFAULT_OPTIONS, radius: 99 } },
    );
    expect(badRadius.statusCode).toBe(400);
  });

  it("only allows browser calls from allow-listed admin origins", async () => {
    const ok = await app.inject({
      method: "OPTIONS",
      url: `/cardify/admin/${MID}/settings`,
      headers: { origin: "http://localhost:5173" },
    });
    expect(ok.statusCode).toBe(204);
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    const evil = await app.inject({
      method: "OPTIONS",
      url: `/cardify/admin/${MID}/settings`,
      headers: { origin: "https://evil.example" },
    });
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("startup", () => {
  it("refuses to build without an admin key", async () => {
    await expect(
      buildApp({ repo: new MemorySettingsRepo(), config: { ...config, adminApiKey: "" } }),
    ).rejects.toThrow(/adminApiKey/);
  });
});
