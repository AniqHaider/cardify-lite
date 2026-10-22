import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import { DEFAULT_SETTINGS, type CardifyPublicConfig } from "@cardify/shared";
import { MerchantIdSchema, SettingsSchema } from "@cardify/shared/schema";
import type { AppConfig } from "./config";
import type { SettingsRepo, StoredSettings } from "./repo";

const SDK_PREFIX = "/cardify/sdk/";
const ADMIN_PREFIX = "/cardify/admin/";

function toPublicConfig(stored: StoredSettings | null): CardifyPublicConfig {
  return stored
    ? { ...stored.settings, version: stored.updatedAt }
    : { ...DEFAULT_SETTINGS, version: 0 };
}

/** Constant-time compare. Length is checked first — timingSafeEqual THROWS on a mismatch. */
function keyMatches(provided: unknown, expected: string): boolean {
  const a = Buffer.from(typeof provided === "string" ? provided : "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface BuildAppOptions {
  repo: SettingsRepo;
  config: Pick<AppConfig, "adminApiKey" | "adminOrigins" | "sdkDir">;
  logger?: boolean;
}

export async function buildApp({ repo, config, logger = false }: BuildAppOptions): Promise<FastifyInstance> {
  // Fail closed: an unset key must never mean "admin API open".
  if (!config.adminApiKey) throw new Error("adminApiKey is required");

  const app = Fastify({ logger });

  // CORS by path. The SDK + config are public to any storefront; the admin API
  // only answers browsers on the allow-listed origins.
  app.addHook("onRequest", async (req, reply) => {
    const url = req.raw.url ?? "";
    const origin = req.headers.origin;
    if (url.startsWith(SDK_PREFIX)) {
      reply.header("access-control-allow-origin", "*");
      reply.header("cross-origin-resource-policy", "cross-origin");
    } else if (url.startsWith(ADMIN_PREFIX) && origin && config.adminOrigins.includes(origin)) {
      reply.header("access-control-allow-origin", origin);
      reply.header("vary", "Origin");
      reply.header("access-control-allow-methods", "GET,PUT,OPTIONS");
      reply.header("access-control-allow-headers", "content-type,x-admin-key");
    }
    if (req.method === "OPTIONS") return reply.code(204).send();
  });

  app.get("/health", async () => ({ ok: true }));

  // Public: what the storefront SDK polls. Never cached, so a toggle in the admin
  // shows up on the next focus/poll.
  app.get<{ Params: { merchantId: string } }>(
    `${SDK_PREFIX}config/:merchantId`,
    async (req, reply) => {
      const id = MerchantIdSchema.safeParse(req.params.merchantId);
      if (!id.success) return reply.code(400).send({ error: "invalid merchant id" });
      reply.header("cache-control", "no-store");
      return toPublicConfig(await repo.get(id.data));
    },
  );

  // Built SDK bundles (cardify-loader.js, cardify-widget.js).
  const sdkRoot = resolve(config.sdkDir);
  if (existsSync(sdkRoot)) {
    await app.register(fastifyStatic, {
      root: sdkRoot,
      prefix: SDK_PREFIX,
      setHeaders: (res) => res.setHeader("cache-control", "no-cache"),
    });
  } else {
    app.log.warn(`SDK dir ${sdkRoot} not found — run \`pnpm build:sdk\` to serve the bundles`);
  }

  // Admin API (key-guarded).
  const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!keyMatches(req.headers["x-admin-key"], config.adminApiKey)) {
      return reply.code(401).send({ error: "invalid or missing x-admin-key" });
    }
  };

  app.get<{ Params: { merchantId: string } }>(
    `${ADMIN_PREFIX}:merchantId/settings`,
    { preHandler: requireAdmin },
    async (req, reply) => {
      const id = MerchantIdSchema.safeParse(req.params.merchantId);
      if (!id.success) return reply.code(400).send({ error: "invalid merchant id" });
      return toPublicConfig(await repo.get(id.data));
    },
  );

  app.put<{ Params: { merchantId: string } }>(
    `${ADMIN_PREFIX}:merchantId/settings`,
    { preHandler: requireAdmin },
    async (req, reply) => {
      const id = MerchantIdSchema.safeParse(req.params.merchantId);
      if (!id.success) return reply.code(400).send({ error: "invalid merchant id" });
      const body = SettingsSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: "invalid settings", issues: body.error.issues });
      return toPublicConfig(await repo.save(id.data, body.data));
    },
  );

  return app;
}
