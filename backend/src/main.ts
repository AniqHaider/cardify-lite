import { buildApp } from "./app";
import { loadConfig } from "./config";
import { createDb, KyselySettingsRepo, MemorySettingsRepo, migrate, type SettingsRepo } from "./repo";

const config = loadConfig();

let repo: SettingsRepo = new MemorySettingsRepo();
let closeDb = async () => {};

if (config.databaseUrl) {
  const db = createDb(config.databaseUrl);
  await migrate(db);
  repo = new KyselySettingsRepo(db);
  closeDb = () => db.destroy();
} else {
  console.warn("[cardify] DATABASE_URL not set: settings live in memory and reset on restart.");
}

const app = await buildApp({ repo, config, logger: true });

const shutdown = async () => {
  await app.close();
  await closeDb();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: config.port, host: config.host });
