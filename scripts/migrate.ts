import { getDatabasePath, getSqlite } from "@/db/client";

const sqlite = getSqlite();
console.log(`Database ready at ${getDatabasePath()}`);
sqlite.close();
