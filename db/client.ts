import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrateSqlite } from "./migrate";

export function getDatabasePath() {
  return process.env.ONELY_DB_PATH ?? path.join(process.cwd(), ".data", "onely.sqlite");
}

export function createStore(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const sqlite = new DatabaseSync(filePath);
  sqlite.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
  migrateSqlite(sqlite);
  return { sqlite };
}

type Store = ReturnType<typeof createStore>;

const globalForOnely = globalThis as unknown as {
  onelyStore?: Store;
};

export function getStore(): Store {
  if (!globalForOnely.onelyStore) {
    globalForOnely.onelyStore = createStore(getDatabasePath());
  }
  return globalForOnely.onelyStore;
}

export function getSqlite() {
  return getStore().sqlite;
}
