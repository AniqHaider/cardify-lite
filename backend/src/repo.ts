import { Kysely, MysqlDialect, sql, type Generated } from "kysely";
import { createPool } from "mysql2";
import { SettingsSchema } from "@cardify/shared/schema";
import type { CardifySettings } from "@cardify/shared";

export interface StoredSettings {
  settings: CardifySettings;
  /** Epoch ms of the last save. */
  updatedAt: number;
}

export interface SettingsRepo {
  get(merchantId: string): Promise<StoredSettings | null>;
  save(merchantId: string, settings: CardifySettings): Promise<StoredSettings>;
}

interface Database {
  cardify_settings: {
    merchant_id: string;
    enabled: number;
    design: string;
    options: unknown;
    updated_at: Generated<Date>;
  };
}

export function createDb(databaseUrl: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new MysqlDialect({
      pool: createPool({ uri: databaseUrl, timezone: "Z", connectionLimit: 5 }),
    }),
  });
}

/** One table, one row per merchant. Idempotent, safe to run on every boot. */
export async function migrate(db: Kysely<Database>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS cardify_settings (
      merchant_id VARCHAR(32) NOT NULL PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      design VARCHAR(32) NOT NULL,
      options JSON NOT NULL,
      updated_at DATETIME(3) NOT NULL
    ) CHARACTER SET utf8mb4
  `.execute(db);
}

export class KyselySettingsRepo implements SettingsRepo {
  constructor(private readonly db: Kysely<Database>) {}

  async get(merchantId: string): Promise<StoredSettings | null> {
    const row = await this.db
      .selectFrom("cardify_settings")
      .selectAll()
      .where("merchant_id", "=", merchantId)
      .executeTakeFirst();
    if (!row) return null;

    const options = typeof row.options === "string" ? JSON.parse(row.options) : row.options;
    const parsed = SettingsSchema.safeParse({
      enabled: row.enabled === 1,
      design: row.design,
      options,
    });
    // A row that no longer validates (e.g. a design was retired) reads as "never
    // configured" rather than crashing the storefront's config fetch.
    if (!parsed.success) return null;
    return { settings: parsed.data, updatedAt: new Date(row.updated_at).getTime() };
  }

  async save(merchantId: string, settings: CardifySettings): Promise<StoredSettings> {
    const now = new Date();
    const values = {
      enabled: settings.enabled ? 1 : 0,
      design: settings.design,
      options: JSON.stringify(settings.options),
      updated_at: now,
    };
    await this.db
      .insertInto("cardify_settings")
      .values({ merchant_id: merchantId, ...values })
      .onDuplicateKeyUpdate(values)
      .execute();
    return { settings, updatedAt: now.getTime() };
  }
}

/** For tests and local experiments without a database. */
export class MemorySettingsRepo implements SettingsRepo {
  private readonly rows = new Map<string, StoredSettings>();

  async get(merchantId: string) {
    return this.rows.get(merchantId) ?? null;
  }

  async save(merchantId: string, settings: CardifySettings) {
    const stored = { settings, updatedAt: Date.now() };
    this.rows.set(merchantId, stored);
    return stored;
  }
}
