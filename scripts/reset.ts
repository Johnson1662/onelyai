import fs from "node:fs";
import { getDatabasePath, getSqlite } from "@/db/client";

const databasePath = getDatabasePath();
getSqlite().close();
for (const filePath of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
  if (fs.existsSync(filePath)) fs.rmSync(filePath);
}
console.log(`Removed local database ${databasePath}`);
